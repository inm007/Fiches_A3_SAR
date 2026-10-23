<?php

namespace App\Services;

use App\Enums\Domaine;
use App\Enums\StatutEtape;
use App\Exceptions\RegleMetierException;
use App\Models\Affectation;
use App\Models\DomaineRole;
use App\Models\FicheA3;
use App\Models\Gain;
use App\Models\Role;
use App\Models\Validation;
use App\Support\Manque;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Crée et résout les demandes des portes 0 (pertinence), 1 (plan) et 2 (clôture). Ne modifie jamais l'étape :
 * FicheWorkflow s'en charge à partir des résultats de ce service.
 */
class ValidationCircuit
{
    public const string CONTROLE_GESTION = 'CONTROLE_GESTION';

    public const string DIRECTION = 'DIRECTION';

    /**
     * Rôles de directeur : le sponsor de la fiche est choisi parmi leurs titulaires et
     * approuve la clôture avec l'un d'eux.
     *
     * @return array<int, string>
     */
    public static function rolesDirecteurs(): array
    {
        return [self::DIRECTION, ...Domaine::rolesValideurs()];
    }

    public function __construct(
        private readonly HistoryLogger $history,
    ) {}

    /**
     * Porte 0 : le chef de département choisi par le pilote valide la pertinence de l'idée.
     *
     * @return array<string, int>
     */
    public function rolesPorte0(): array
    {
        return [Organigramme::ROLE_CHEF => 1];
    }

    /**
     * Rôles sollicités à la porte 1 : les directeurs des domaines cochés, tous en même
     * temps (ordre 1), selon la correspondance de l'écran Circuit de validation ; pour
     * « Autres », le directeur choisi par le pilote. Tous doivent approuver.
     *
     * @return array<string, int> code du rôle => ordre
     */
    public function rolesPorte1(FicheA3 $fiche): array
    {
        $correspondance = DomaineRole::correspondance();
        $roles = [];

        foreach ($fiche->domaines()->with('roleValideur:id,code')->get() as $domaine) {
            $codes = $domaine->domaine === Domaine::Autres->value
                ? array_filter([$domaine->roleValideur?->code])
                : ($correspondance[$domaine->domaine] ?? []);
            foreach ($codes as $code) {
                $roles[$code] = 1;
            }
        }

        return $roles;
    }

    /**
     * Porte 2 : le Contrôle de gestion valide les gains s'il y en a, puis le directeur
     * sponsor choisi en section 1 approuve la clôture.
     *
     * @return array<string, int>
     */
    public function rolesPorte2(FicheA3 $fiche): array
    {
        $avecGains = ! $fiche->sans_gain_chiffre && $fiche->gains()->exists();
        $sponsor = $this->roleSponsor($fiche) ?? self::DIRECTION;

        return $avecGains
            ? [self::CONTROLE_GESTION => 1, $sponsor => 2]
            : [$sponsor => 1];
    }

    /**
     * Rôle de directeur sous lequel le sponsor approuve la clôture : Direction s'il l'a,
     * sinon son premier rôle de directeur. Null sans sponsor ou si le sponsor n'est plus directeur.
     */
    public function roleSponsor(FicheA3 $fiche): ?string
    {
        if ($fiche->sponsor_id === null) {
            return null;
        }

        $codes = Affectation::query()
            ->enCours()
            ->where('user_id', $fiche->sponsor_id)
            ->whereHas('role', fn ($query) => $query->whereIn('code', self::rolesDirecteurs()))
            ->whereHas('user', fn ($query) => $query->where('actif', true))
            ->orderBy('id')
            ->with('role:id,code')
            ->get()
            ->pluck('role.code');

        return $codes->contains(self::DIRECTION) ? self::DIRECTION : $codes->first();
    }

    /**
     * @return array<string, int>
     */
    public function rolesPorte(FicheA3 $fiche, int $porte): array
    {
        return match ($porte) {
            0 => $this->rolesPorte0(),
            1 => $this->rolesPorte1($fiche),
            default => $this->rolesPorte2($fiche),
        };
    }

    /**
     * Premier titulaire du rôle dans l'unité de la fiche, à défaut une affectation globale ;
     * le pilote et l'équipe ne sont jamais sollicités sur leur propre fiche (B8).
     */
    public function titulaire(string $roleCode, FicheA3 $fiche, ?int $porte = null): ?int
    {
        return $this->titulaires($roleCode, $fiche, $porte)->first();
    }

    /**
     * Titulaires actifs du rôle, ceux de l'unité de la fiche d'abord, puis ceux du périmètre
     * global. Porte 0 : le chef choisi par le pilote ; porte 2 : le directeur sponsor.
     *
     * @return Collection<int, int> identifiants des utilisateurs
     */
    public function titulaires(string $roleCode, FicheA3 $fiche, ?int $porte = null): Collection
    {
        $redacteurs = $fiche->redacteursIds();
        $base = Affectation::query()
            ->enCours()
            ->whereHas('role', fn ($query) => $query->where('code', $roleCode))
            ->whereHas('user', fn ($query) => $query->where('actif', true))
            ->when($redacteurs !== [], fn ($query) => $query->whereNotIn('user_id', $redacteurs))
            ->orderBy('id');

        $personneChoisie = match (true) {
            $roleCode === Organigramme::ROLE_CHEF => $fiche->chef_pertinence_id ?? 0,
            $porte === 2 && $roleCode === $this->roleSponsor($fiche) => $fiche->sponsor_id,
            default => null,
        };
        if ($personneChoisie !== null) {
            return (clone $base)->where('user_id', $personneChoisie)->pluck('user_id')->unique()->values();
        }

        return (clone $base)->where('unite_id', $fiche->unite_id)->pluck('user_id')
            ->concat((clone $base)->whereNull('unite_id')->pluck('user_id'))
            ->unique()
            ->values();
    }

    /**
     * Titulaires qui peuvent porter une demande : ceux de son rôle, à sa porte.
     *
     * @return Collection<int, int>
     */
    public function titulairesDe(Validation $validation, FicheA3 $fiche): Collection
    {
        return $this->titulaires($validation->role()->value('code'), $fiche, $validation->porte);
    }

    /**
     * Une demande en attente dont le valideur n'est plus titulaire actif du rôle (compte
     * désactivé, affectation terminée, devenu pilote ou membre) ne peut plus aboutir sans
     * partage : aucun des valideurs de la demande n'est encore titulaire actif du rôle.
     */
    public function valideurIndisponible(Validation $validation, FicheA3 $fiche): bool
    {
        $titulaires = $this->titulairesDe($validation, $fiche);

        return collect($validation->valideursIds())->intersect($titulaires)->isEmpty();
    }

    /**
     * Partage d'une demande en attente avec un autre titulaire du même rôle, par
     * l'administrateur fonctionnel (absence, maladie, départ) : les deux valideurs voient
     * la demande et le premier qui décide la traite. Le valideur d'origine la garde.
     */
    public function partager(Validation $validation, int $valideurId, ?int $auteurId, ?string $motif = null): Validation
    {
        return DB::transaction(function () use ($validation, $valideurId, $auteurId, $motif): Validation {
            /** @var Validation $validation */
            $validation = Validation::query()->whereKey($validation->id)->lockForUpdate()->firstOrFail();
            $fiche = FicheA3::query()->whereKey($validation->fiche_id)->firstOrFail();

            if ($validation->decision !== 'EN_ATTENTE') {
                throw RegleMetierException::conflit('Cette demande n’est plus en attente.');
            }
            if (! $this->titulairesDe($validation, $fiche)->contains($valideurId)) {
                throw RegleMetierException::conditionsManquantes('Partage impossible.', ['Le valideur associé doit être titulaire actif du rôle, dans l’unité de la fiche ou au périmètre global, et ne faire partie ni des pilotes ni de l’équipe de la fiche.']);
            }
            if ($validation->estValideur($valideurId)) {
                return $validation;
            }

            $validation->partages()->attach($valideurId, ['ajoute_par' => $auteurId, 'motif' => $motif ?: null]);
            $this->history->log($fiche, $auteurId, 'PARTAGE_VALIDATION', 'validation_'.$validation->id, null, $valideurId, $motif ?: null);

            return $validation->refresh();
        });
    }

    /**
     * Retire un valideur associé d'une demande partagée.
     */
    public function retirerPartage(Validation $validation, int $valideurId, ?int $auteurId): Validation
    {
        return DB::transaction(function () use ($validation, $valideurId, $auteurId): Validation {
            /** @var Validation $validation */
            $validation = Validation::query()->whereKey($validation->id)->lockForUpdate()->firstOrFail();

            if ($validation->partages()->detach($valideurId) > 0) {
                $this->history->log($validation->fiche, $auteurId, 'FIN_PARTAGE_VALIDATION', 'validation_'.$validation->id, $valideurId, null, null);
            }

            return $validation->refresh();
        });
    }

    /**
     * Réattribution d'une demande en attente à un autre titulaire du même rôle, par
     * l'administrateur fonctionnel (absence, départ, changement d'affectation).
     */
    public function reattribuer(Validation $validation, int $valideurId, ?int $auteurId, ?string $motif = null): Validation
    {
        return DB::transaction(function () use ($validation, $valideurId, $auteurId, $motif): Validation {
            /** @var Validation $validation */
            $validation = Validation::query()->whereKey($validation->id)->lockForUpdate()->firstOrFail();
            $fiche = FicheA3::query()->whereKey($validation->fiche_id)->firstOrFail();

            if ($validation->decision !== 'EN_ATTENTE') {
                throw RegleMetierException::conflit('Cette demande n’est plus en attente.');
            }
            if (! $this->titulairesDe($validation, $fiche)->contains($valideurId)) {
                throw RegleMetierException::conditionsManquantes('Réattribution impossible.', ['Le nouveau valideur doit être titulaire actif du rôle, dans l’unité de la fiche ou au périmètre global, et ne faire partie ni des pilotes ni de l’équipe de la fiche.']);
            }
            if ($validation->valideur_id === $valideurId) {
                return $validation;
            }

            $ancien = $validation->valideur_id;
            $validation->update(['valideur_id' => $valideurId]);
            $validation->partages()->detach($valideurId);
            $this->history->log($fiche, $auteurId, 'REATTRIBUTION_VALIDATION', 'validation_'.$validation->id, $ancien, $valideurId, $motif ?: null);

            return $validation->refresh();
        });
    }

    /**
     * Rôles sans titulaire disponible : la soumission est refusée (B2).
     *
     * @param  array<string, int>  $roles
     * @return array<int, string|Manque>
     */
    public function rolesSansTitulaire(array $roles, FicheA3 $fiche, int $porte): array
    {
        $manques = [];
        foreach (array_keys($roles) as $code) {
            if ($this->titulaire($code, $fiche, $porte) === null) {
                if ($code === Organigramme::ROLE_CHEF) {
                    $manques[] = Manque::section(4, 'Section 4 : le chef de département choisi n’est plus disponible (profil retiré, compte désactivé ou membre de la fiche) : choisissez-en un autre.');

                    continue;
                }
                if ($porte === 2 && $code === $this->roleSponsor($fiche)) {
                    $manques[] = 'Le directeur sponsor ne peut pas approuver la clôture (compte désactivé, profil retiré, pilote ou membre de la fiche) : demandez à l’administrateur fonctionnel.';

                    continue;
                }
                $libelle = Role::where('code', $code)->value('libelle') ?? $code;
                $manques[] = "Aucun titulaire du rôle « {$libelle} » n’est affecté à l’unité de la fiche ni au périmètre global.";
            }
        }

        return $manques;
    }

    /**
     * Ouvre les demandes d'une porte. Une signature obtenue est conservée si
     * l'empreinte de son domaine n'a pas changé (PRD §7, règles).
     *
     * @param  array<string, int>  $roles
     * @return Collection<int, Validation> demandes nouvellement actives
     */
    public function ouvrir(FicheA3 $fiche, int $porte, array $roles): Collection
    {
        $ouvertes = collect();

        foreach ($roles as $code => $ordre) {
            $role = Role::where('code', $code)->firstOrFail();
            $empreinte = $this->empreinte($fiche, $code);
            $derniere = $this->derniere($fiche, $porte, $role->id);

            // jsonb réordonne les clés : comparaison des paires, sans tenir compte de l'ordre.
            if ($derniere?->decision === 'VALIDE' && $derniere->empreinte_domaine == $empreinte) {
                continue;
            }

            $ouvertes->push(Validation::create([
                'fiche_id' => $fiche->id,
                'porte' => $porte,
                'role_id' => $role->id,
                'valideur_id' => $this->titulaire($code, $fiche, $porte),
                'decision' => 'EN_ATTENTE',
                'version_fiche' => $fiche->version,
                'empreinte_domaine' => $empreinte,
                'demandee_le' => now(),
                'ordre' => $ordre,
            ]));
        }

        return $ouvertes->filter(fn (Validation $validation) => $this->estActionnable($validation, $fiche));
    }

    /**
     * Demande la plus récente pour chaque rôle requis de la porte.
     *
     * @param  array<string, int>  $roles
     * @return Collection<int, Validation>
     */
    public function courantes(FicheA3 $fiche, int $porte, array $roles): Collection
    {
        return collect(array_keys($roles))
            ->map(fn (string $code) => $this->derniere($fiche, $porte, Role::where('code', $code)->value('id')))
            ->filter()
            ->values();
    }

    /**
     * @param  array<string, int>  $roles
     */
    public function porteApprouvee(FicheA3 $fiche, int $porte, array $roles): bool
    {
        $courantes = $this->courantes($fiche, $porte, $roles);

        return $courantes->count() === count($roles)
            && $courantes->every(fn (Validation $validation) => $validation->decision === 'VALIDE');
    }

    /**
     * B7 : la demande est en attente, à l'étape active de sa porte, et toutes les
     * demandes d'ordre inférieur sont approuvées.
     */
    public function estActionnable(Validation $validation, FicheA3 $fiche): bool
    {
        $etapeAttendue = match ($validation->porte) {
            0 => StatutEtape::EnValidationPertinence,
            1 => StatutEtape::EnValidationPlan,
            default => StatutEtape::EnValidationCloture,
        };
        if ($validation->decision !== 'EN_ATTENTE' || $fiche->etape() !== $etapeAttendue) {
            return false;
        }

        $roles = $this->rolesPorte($fiche, $validation->porte);

        return $this->courantes($fiche, $validation->porte, $roles)
            ->filter(fn (Validation $autre) => $autre->ordre < $validation->ordre)
            ->every(fn (Validation $autre) => $autre->decision === 'VALIDE');
    }

    /**
     * Demandes qui attendent le profil actif, les plus anciennes en premier (B7, B8).
     *
     * @return Collection<int, Validation>
     */
    public function aTraiterPar(ActiveProfile $profile): Collection
    {
        return Validation::query()
            ->with(['fiche:id,numero_a3,titre,statut_etape,pilote_id,unite_id,sans_gain_chiffre', 'role:id,code,libelle'])
            ->pourValideur($profile->userId())
            ->where('role_id', $profile->roleId())
            ->where('decision', 'EN_ATTENTE')
            ->orderBy('demandee_le')
            ->get()
            ->filter(fn (Validation $validation) => ! $validation->fiche->estRedacteur($profile->userId())
                && $this->estActionnable($validation, $validation->fiche))
            ->values();
    }

    /**
     * Clôt les demandes encore en attente d'une porte après un refus.
     */
    public function annulerEnAttente(FicheA3 $fiche, int $porte, string $motif): void
    {
        Validation::query()
            ->where('fiche_id', $fiche->id)
            ->where('porte', $porte)
            ->where('decision', 'EN_ATTENTE')
            ->update(['decision' => 'ANNULE', 'commentaire' => $motif, 'decidee_le' => now()]);
    }

    private function derniere(FicheA3 $fiche, int $porte, ?int $roleId): ?Validation
    {
        if ($roleId === null) {
            return null;
        }

        return Validation::query()
            ->where('fiche_id', $fiche->id)
            ->where('porte', $porte)
            ->where('role_id', $roleId)
            ->whereIn('decision', ['EN_ATTENTE', 'VALIDE', 'REFUSE'])
            ->latest('id')
            ->first();
    }

    /**
     * Empreinte du contenu que le rôle valide. Une nouvelle version (T11) invalide toute
     * signature ; sinon seul un changement du domaine concerné la remet en cause.
     *
     * @return array{version: int, hash: string}
     */
    public function empreinte(FicheA3 $fiche, string $roleCode): array
    {
        $contenu = match ($roleCode) {
            Organigramme::ROLE_CHEF => [
                $fiche->only(['titre', 'type_amelioration', 'date_cible', 'contexte', 'enonce_probleme', 'objectif_smart', 'resultats_attendus']),
                $fiche->indicateurs()->with('mesures:id,indicateur_id,type,valeur')->orderBy('id')->get(['id', 'libelle', 'principal'])->toArray(),
            ],
            'VALIDEUR_PRODUCTION' => [
                $fiche->only(['titre', 'objectif_smart', 'perimetre', 'methode_analyse', 'date_cible']),
                $fiche->causes()->orderBy('id')->get(['libelle', 'categorie', 'racine'])->toArray(),
                $fiche->actions()->orderBy('id')->get(['description', 'responsable_id', 'echeance', 'cout_estime'])->toArray(),
            ],
            self::CONTROLE_GESTION => [
                $fiche->cout_mise_en_oeuvre_b,
                $fiche->gains()->orderBy('id')->get(['categorie', 'hypothese_calcul', 'montant_annuel', 'statut'])->toArray(),
            ],
            self::DIRECTION => [now()->toIso8601String()],
            default => $fiche->risques()
                ->whereIn('domaine', $this->domainesDuRole($roleCode))
                ->orderBy('id')
                ->get(['domaine', 'description', 'moc_requis', 'mesure_maitrise'])
                ->toArray(),
        };

        return ['version' => (int) $fiche->version, 'hash' => sha1(json_encode($contenu, JSON_UNESCAPED_UNICODE) ?: '')];
    }

    /**
     * @return array<int, string>
     */
    private function domainesDuRole(string $roleCode): array
    {
        return [...DomaineRole::domainesDuRole($roleCode), Domaine::Autres->value];
    }

    /**
     * Décision du Contrôle de gestion sur une ligne de gain, pendant sa demande de porte 2.
     */
    public function deciderGain(Gain $gain, string $decision, ActiveProfile $profile): Gain
    {
        return DB::transaction(function () use ($gain, $decision, $profile): Gain {
            $fiche = FicheA3::query()->whereKey($gain->fiche_id)->lockForUpdate()->firstOrFail();

            if (! $profile->is(self::CONTROLE_GESTION)) {
                throw RegleMetierException::interdit('Seul le Contrôle de gestion valide les gains.');
            }

            $demande = Validation::query()
                ->where('fiche_id', $fiche->id)
                ->where('porte', 2)
                ->pourValideur($profile->userId())
                ->where('decision', 'EN_ATTENTE')
                ->first();

            if ($demande === null || ! $this->estActionnable($demande, $fiche)) {
                throw RegleMetierException::conflit('Aucune demande de validation des gains n’est active sur cette fiche.');
            }

            $ancien = $gain->statut;
            $gain->update([
                'statut' => $decision,
                'valide_par_id' => $profile->userId(),
                'date_validation' => now(),
            ]);
            $this->history->log($fiche, $profile->userId(), 'DECISION_GAIN', 'gain_'.$gain->id, $ancien, $decision);

            return $gain->refresh();
        });
    }
}
