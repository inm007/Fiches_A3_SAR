<?php

namespace App\Services;

use App\Enums\Domaine;
use App\Enums\StatutEtape;
use App\Exceptions\RegleMetierException;
use App\Models\Affectation;
use App\Models\FicheA3;
use App\Models\Gain;
use App\Models\Role;
use App\Models\Validation;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Crée et résout les demandes des portes 1 et 2 (PRD §7). Ne modifie jamais l'étape :
 * FicheWorkflow s'en charge à partir des résultats de ce service.
 */
class ValidationCircuit
{
    public const string CONTROLE_GESTION = 'CONTROLE_GESTION';

    public const string DIRECTION = 'DIRECTION';

    public function __construct(private readonly HistoryLogger $history) {}

    /**
     * Rôles sollicités à la porte 1 : Production / Exploitation d'abord (ordre 1),
     * puis les valideurs des domaines cochés, en parallèle (ordre 2).
     *
     * @return array<string, int> code du rôle => ordre
     */
    public function rolesPorte1(FicheA3 $fiche): array
    {
        $roles = ['VALIDEUR_PRODUCTION' => 1];

        foreach ($fiche->domaines()->with('roleValideur:id,code')->get() as $domaine) {
            $code = $domaine->roleValideur?->code;
            if ($code !== null && ! isset($roles[$code])) {
                $roles[$code] = 2;
            }
        }

        return $roles;
    }

    /**
     * @return array<string, int>
     */
    public function rolesPorte2(FicheA3 $fiche): array
    {
        $avecGains = ! $fiche->sans_gain_chiffre && $fiche->gains()->exists();

        return $avecGains
            ? [self::CONTROLE_GESTION => 1, self::DIRECTION => 2]
            : [self::DIRECTION => 1];
    }

    /**
     * Premier titulaire du rôle dans l'unité de la fiche, à défaut une affectation globale ;
     * le pilote n'est jamais sollicité sur sa propre fiche (B8).
     */
    public function titulaire(string $roleCode, FicheA3 $fiche): ?int
    {
        $base = Affectation::query()
            ->enCours()
            ->whereHas('role', fn ($query) => $query->where('code', $roleCode))
            ->whereHas('user', fn ($query) => $query->where('actif', true))
            ->when($fiche->pilote_id !== null, fn ($query) => $query->where('user_id', '!=', $fiche->pilote_id))
            ->orderBy('id');

        return (clone $base)->where('unite_id', $fiche->unite_id)->value('user_id')
            ?? (clone $base)->whereNull('unite_id')->value('user_id');
    }

    /**
     * Rôles sans titulaire disponible : la soumission est refusée (B2).
     *
     * @param  array<string, int>  $roles
     * @return array<int, string>
     */
    public function rolesSansTitulaire(array $roles, FicheA3 $fiche): array
    {
        $manques = [];
        foreach (array_keys($roles) as $code) {
            if ($this->titulaire($code, $fiche) === null) {
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
                'valideur_id' => $this->titulaire($code, $fiche),
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
        $etapeAttendue = $validation->porte === 1 ? StatutEtape::EnValidationPlan : StatutEtape::EnValidationCloture;
        if ($validation->decision !== 'EN_ATTENTE' || $fiche->etape() !== $etapeAttendue) {
            return false;
        }

        $roles = $validation->porte === 1 ? $this->rolesPorte1($fiche) : $this->rolesPorte2($fiche);

        return $this->courantes($fiche, $validation->porte, $roles)
            ->filter(fn (Validation $autre) => $autre->ordre < $validation->ordre)
            ->every(fn (Validation $autre) => $autre->decision === 'VALIDE');
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
            'VALIDEUR_PRODUCTION' => [
                $fiche->only(['titre', 'objectif_smart', 'perimetre', 'methode_analyse', 'date_cible']),
                $fiche->causes()->orderBy('id')->get(['libelle', 'categorie', 'racine'])->toArray(),
                $fiche->actions()->orderBy('id')->get(['description', 'responsable_id', 'echeance', 'cout_estime'])->toArray(),
            ],
            self::CONTROLE_GESTION => [
                $fiche->cout_mise_en_oeuvre_b,
                $fiche->gains()->orderBy('id')->get(['categorie', 'quantite', 'cout_unitaire', 'statut'])->toArray(),
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
        return collect(Domaine::cases())
            ->filter(fn (Domaine $domaine) => $domaine->roleValideur() === $roleCode)
            ->map(fn (Domaine $domaine) => $domaine->value)
            ->push(Domaine::Autres->value)
            ->values()
            ->all();
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
                ->where('valideur_id', $profile->userId())
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
