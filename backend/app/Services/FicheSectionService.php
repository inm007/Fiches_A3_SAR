<?php

namespace App\Services;

use App\Enums\Domaine;
use App\Enums\StatutAction;
use App\Enums\StatutEtape;
use App\Exceptions\RegleMetierException;
use App\Http\Requests\FicheSectionRules;
use App\Models\ActionA3;
use App\Models\Affectation;
use App\Models\Equipement;
use App\Models\FicheA3;
use App\Models\FicheA3Indicateur;
use App\Models\ReferenceSap;
use App\Models\Role;
use App\Models\ValeurListe;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

/**
 * Enregistrement explicite d'une section par le pilote (PRD §4.2, §4.4).
 * Chaque enregistrement est tracé dans l'historique (PRD §14).
 */
class FicheSectionService
{
    public function __construct(
        private readonly HistoryLogger $history,
        private readonly FicheWorkflow $workflow,
    ) {}

    /**
     * Étapes auxquelles le pilote peut enregistrer chaque section.
     *
     * @return array<int, array<int, StatutEtape>>
     */
    public static function etapesEditables(): array
    {
        $suivi = StatutEtape::etapesDeSuivi();
        $resultats = [StatutEtape::MesureResultats, StatutEtape::VerificationMaintien];

        return [
            // Les sections 2 à 4 ont été validées par le chef de département : elles se figent
            // à la soumission de la pertinence ; un renvoi par le chef les rouvre.
            1 => [StatutEtape::Ouvert, StatutEtape::EnCours],
            2 => [StatutEtape::Ouvert],
            3 => [StatutEtape::Ouvert],
            4 => [StatutEtape::Ouvert],
            5 => [StatutEtape::EnCours],
            6 => [StatutEtape::EnCours],
            7 => [StatutEtape::EnCours, StatutEtape::RealisationActions],
            8 => $resultats,
            9 => $suivi,
            10 => $suivi,
            11 => $resultats,
        ];
    }

    /**
     * Sections que les membres de l'équipe renseignent : analyse et suivi. L'identification
     * et l'objectif (1 à 4) restent au pilote, qui les soumet au chef de département.
     */
    public const array SECTIONS_EQUIPE = [5, 6, 7, 8, 9, 10, 11];

    /**
     * Le pilote : toutes les sections ouvertes à l'étape (1 à 4 à l'étape Ouvert, avant la
     * validation de la pertinence) ; un membre de l'équipe : celles d'analyse et de suivi.
     *
     * @return array<int, int>
     */
    public function sectionsEditables(FicheA3 $fiche, ActiveProfile $profile): array
    {
        $etape = $fiche->etape();
        $ouvertes = collect(self::etapesEditables())
            ->filter(fn (array $etapes) => in_array($etape, $etapes, true))
            ->keys();

        if ($profile->estPiloteDe($fiche)) {
            return $ouvertes->all();
        }

        if ($fiche->estMembre($profile->userId())) {
            return $ouvertes->intersect(self::SECTIONS_EQUIPE)->values()->all();
        }

        return [];
    }

    /**
     * État de chaque section pour le profil actif, avec la raison affichée à l'écran :
     * modifiable, figée (étape passée, validation en cours, attente, clôture), à venir
     * (s'ouvre à une étape ultérieure), automatique (signatures) ou lecture seule
     * (profil qui ne rédige pas la fiche).
     *
     * @return array<int, array{numero: int, etat: string, raison: string|null}>
     */
    public function etatsSections(FicheA3 $fiche, ActiveProfile $profile): array
    {
        $editables = $this->sectionsEditables($fiche, $profile);
        $estPilote = $profile->estPiloteDe($fiche);
        $estMembre = $fiche->estMembre($profile->userId());
        $etape = $fiche->etape();
        $ordre = [
            StatutEtape::Ouvert, StatutEtape::EnValidationPertinence, StatutEtape::EnCours, StatutEtape::EnValidationPlan, StatutEtape::RealisationActions,
            StatutEtape::MesureResultats, StatutEtape::VerificationMaintien, StatutEtape::EnValidationCloture, StatutEtape::Cloture,
        ];
        $position = array_search($etape, $ordre, true);

        $etats = [];
        foreach (range(1, 12) as $section) {
            $etats[] = ['numero' => $section, ...match (true) {
                $section === 12 => ['etat' => 'auto', 'raison' => 'Remplie par les décisions des valideurs.'],
                in_array($section, $editables, true) => ['etat' => 'editable', 'raison' => null],
                $etape === StatutEtape::Ouvert && $fiche->pilote_id === null && $section <= 4 => ['etat' => 'lecture', 'raison' => 'L’administrateur fonctionnel désigne d’abord le pilote, qui renseignera cette section.'],
                $etape === StatutEtape::Ouvert && $section <= 4 => ['etat' => 'lecture', 'raison' => 'Seul le pilote renseigne cette section avant la validation de la pertinence.'],
                $etape === StatutEtape::EnValidationPertinence => ['etat' => 'fige', 'raison' => 'En validation de la pertinence : la saisie reprend après la décision du chef de département.'],
                $estMembre && ! $estPilote && ! in_array($section, self::SECTIONS_EQUIPE, true) => ['etat' => 'lecture', 'raison' => 'Seul le pilote modifie l’identification et l’objectif.'],
                in_array($section, [2, 3, 4], true) && $fiche->pertinence_validee_le !== null => ['etat' => 'fige', 'raison' => 'Validée par le chef de département avec la pertinence : elle ne change plus.'],
                ! $estPilote && ! $estMembre => ['etat' => 'lecture', 'raison' => 'Seuls le pilote et son équipe modifient cette section.'],
                $etape === StatutEtape::Cloture => ['etat' => 'fige', 'raison' => 'Fiche clôturée : plus aucune modification.'],
                $etape === StatutEtape::ClasseSansSuite => ['etat' => 'fige', 'raison' => 'Fiche classée sans suite : plus aucune modification.'],
                $etape === StatutEtape::EnAttente => ['etat' => 'fige', 'raison' => 'Fiche en attente : levez le blocage pour reprendre la saisie.'],
                in_array($etape, [StatutEtape::EnValidationPlan, StatutEtape::EnValidationCloture], true) => ['etat' => 'fige', 'raison' => 'En validation : la saisie reprend après la décision des valideurs.'],
                default => $this->etatHorsEtape($section, $ordre, $position),
            }];
        }

        return $etats;
    }

    /**
     * @param  array<int, StatutEtape>  $ordre
     * @return array{etat: string, raison: string}
     */
    private function etatHorsEtape(int $section, array $ordre, int|false $position): array
    {
        $etapes = self::etapesEditables()[$section];
        $premiere = min(array_map(fn (StatutEtape $etape) => array_search($etape, $ordre, true), $etapes));

        if ($position === false || $premiere > $position) {
            return ['etat' => 'a_venir', 'raison' => 'S’ouvre à l’étape « '.$ordre[$premiere]->libelle().' ».'];
        }

        $libelles = implode(' » et « ', array_map(fn (StatutEtape $etape) => $etape->libelle(), $etapes));

        return ['etat' => 'fige', 'raison' => 'Figée : modifiable seulement à l’étape « '.$libelles.' ». Une nouvelle boucle la rouvre.'];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function enregistrer(FicheA3 $fiche, int $section, array $data, ActiveProfile $profile): FicheA3
    {
        return DB::transaction(function () use ($fiche, $section, $data, $profile): FicheA3 {
            /** @var FicheA3 $fiche */
            $fiche = FicheA3::query()->whereKey($fiche->id)->lockForUpdate()->firstOrFail();

            if (! in_array($section, $this->sectionsEditables($fiche, $profile), true)) {
                throw RegleMetierException::interdit('La section '.$section.' n’est pas modifiable par ce profil à l’étape « '.$fiche->etape()->libelle().' ».');
            }

            $userId = $profile->userId();
            $avant = $fiche->getAttributes();

            match ($section) {
                1 => $this->section1($fiche, $data),
                2 => $this->section2($fiche, $data),
                3 => $this->section3($fiche, $data),
                4 => $this->section4($fiche, $data),
                5 => $this->section5($fiche, $data),
                6 => $this->section6($fiche, $data),
                7 => $this->section7($fiche, $data),
                8 => $this->section8($fiche, $data),
                9 => $this->section9($fiche, $data),
                10 => $this->section10($fiche, $data),
                11 => $this->section11($fiche, $data),
            };

            $fiche->save();
            $apres = collect($fiche->getChanges())->except(['updated_at'])->all();
            $this->history->logChanges($fiche, $userId, collect($avant)->only(array_keys($apres))->all(), $apres);
            $this->history->log($fiche, $userId, 'ENREGISTREMENT_SECTION', 'section_'.$section, null, null, 'Section '.$section.' enregistrée');

            return $fiche->refresh();
        });
    }

    /**
     * Règles communes à la déclaration (T1) et à la section 1 : origine prise dans sa liste,
     * précision de l'origine « Autre », équipement de l'unité choisie.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, string> champ => message
     */
    public static function erreursIdentification(array $data): array
    {
        $origine = ValeurListe::query()->whereKey($data['origine_id'])->deLaListe('origine')->first();
        $equipementId = $data['equipement_id'] ?? null;

        return array_filter([
            'origine_id' => $origine === null ? 'Choisissez une origine de la liste.' : null,
            'origine_precision' => $origine?->code === 'AUTRE' && blank($data['origine_precision'] ?? null) ? 'Précisez l’origine « Autre ».' : null,
            'equipement_id' => $equipementId !== null && ! Equipement::whereKey($equipementId)->where('unite_id', $data['unite_id'])->exists()
                ? 'L’équipement doit appartenir à l’unité de la fiche.'
                : null,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function section1(FicheA3 $fiche, array $data): void
    {
        $this->exigerValeurListe('type_amelioration', $data['type_amelioration'] ?? null);
        $erreurs = self::erreursIdentification($data);
        if ($erreurs !== []) {
            throw RegleMetierException::conditionsManquantes('Identification invalide.', array_values($erreurs));
        }
        $this->exigerPilotesDeLUnite($fiche, (int) $data['unite_id']);
        if (($data['sponsor_id'] ?? null) !== null && (int) $data['sponsor_id'] !== $fiche->sponsor_id) {
            $this->exigerDirecteurDisponible($fiche, (int) $data['sponsor_id']);
        }

        $fiche->fill(collect($data)->only([
            'titre', 'unite_id', 'equipement_id', 'sponsor_id', 'date_lancement', 'date_cible',
            'type_amelioration', 'origine_id', 'origine_precision',
        ])->all());

        $avis = $data['numero_avis_sap'] ?? null;
        $ordre = $data['numero_ordre_sap'] ?? null;
        $reference = $fiche->referenceSap()->first();
        if ($reference !== null || $avis !== null || $ordre !== null) {
            ($reference ?? new ReferenceSap(['fiche_id' => $fiche->id]))->fill([
                'equipement_id' => $data['equipement_id'] ?? null,
                'numero_avis' => $avis,
                'numero_ordre' => $ordre,
            ])->save();
        }
    }

    /**
     * Le sponsor approuve la clôture : un directeur actif qui ne rédige pas la fiche.
     */
    private function exigerDirecteurDisponible(FicheA3 $fiche, int $userId): void
    {
        $estDirecteur = Affectation::query()->titulaires(ValidationCircuit::rolesDirecteurs())->where('user_id', $userId)->exists();
        if (! $estDirecteur || $fiche->estRedacteur($userId)) {
            throw RegleMetierException::conditionsManquantes('Sponsor invalide.', ['Le sponsor est un directeur actif, qui ne pilote pas la fiche et ne fait pas partie de son équipe.']);
        }
    }

    /**
     * Le chef qui valide la pertinence : titulaire actif du profil Chef de département, qui
     * ne rédige pas la fiche.
     */
    private function exigerChefDisponible(FicheA3 $fiche, int $userId): void
    {
        $estChef = Affectation::query()->titulaires(Organigramme::ROLE_CHEF)->where('user_id', $userId)->exists();
        if (! $estChef || $fiche->estRedacteur($userId)) {
            throw RegleMetierException::conditionsManquantes('Chef de département invalide.', ['Choisissez un chef de département actif, qui ne pilote pas la fiche et ne fait pas partie de son équipe.']);
        }
    }

    /**
     * Le pilote, les responsables et les valideurs dépendent de l'unité : elle ne change que
     * si chaque pilote de la fiche est aussi pilote de la nouvelle unité.
     */
    private function exigerPilotesDeLUnite(FicheA3 $fiche, int $uniteId): void
    {
        if ($uniteId === $fiche->unite_id) {
            return;
        }

        foreach (array_filter([$fiche->pilote_id]) as $piloteId) {
            $estPilote = Affectation::query()->enCours()->where('user_id', $piloteId)->where('unite_id', $uniteId)
                ->whereHas('role', fn ($query) => $query->where('code', 'PILOTE'))->exists();
            if (! $estPilote) {
                throw RegleMetierException::conditionsManquantes('Unité inchangée.', ['Le pilote n’est pas pilote de cette unité : demandez à l’administrateur fonctionnel de désigner un pilote de la nouvelle unité.']);
            }
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function section2(FicheA3 $fiche, array $data): void
    {
        if (($data['frequence_id'] ?? null) !== null) {
            $this->exigerIdListe('frequence', $data['frequence_id']);
        }

        $fiche->fill(collect($data)->only(['contexte', 'enonce_probleme', 'frequence_id', 'impact_financier_estime'])->all());

        foreach (FicheSectionRules::IMPACTS as $type) {
            $description = trim((string) ($data['impacts'][$type] ?? ''));
            $impact = $fiche->impacts()->where('type_impact', $type)->first();

            if ($description === '') {
                $impact?->delete();
            } else {
                $fiche->impacts()->updateOrCreate(['type_impact' => $type], ['description' => $description]);
            }
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function section3(FicheA3 $fiche, array $data): void
    {
        // Le rôle de chaque indicateur (principal, à ne pas dégrader, suivi) se choisit ici ;
        // la section 4 le reprend. Sans rôle envoyé, celui déjà enregistré est conservé.
        $avecRoles = collect($data['indicateurs'])->contains(fn (array $item) => array_key_exists('role', $item));
        if (collect($data['indicateurs'])->where('role', 'PRINCIPAL')->count() > 1) {
            throw RegleMetierException::conditionsManquantes('Indicateurs invalides.', ['Un seul indicateur peut être le KPI principal.']);
        }

        $this->sync($fiche->indicateurs(), $data['indicateurs'], 'indicateur', function (array $item, ?Model $existing) use ($fiche, $avecRoles): Model {
            /** @var FicheA3Indicateur $indicateur */
            $indicateur = $existing ?? new FicheA3Indicateur(['fiche_id' => $fiche->id]);
            $indicateur->fill(collect($item)->only(['libelle', 'unite_mesure', 'sens', 'source', 'periode'])->all());
            if ($avecRoles) {
                $indicateur->principal = ($item['role'] ?? null) === 'PRINCIPAL';
                $indicateur->a_ne_pas_degrader = ($item['role'] ?? null) === 'A_NE_PAS_DEGRADER';
            }
            $indicateur->save();

            foreach (['reference' => 'REFERENCE', 'cible' => 'CIBLE', 'actuelle' => 'ACTUELLE'] as $champ => $type) {
                $this->enregistrerMesure($indicateur, $type, $item[$champ] ?? null);
            }

            return $indicateur;
        }, function (Model $indicateur): void {
            $indicateur->mesures()->delete();
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function section4(FicheA3 $fiche, array $data): void
    {
        $ids = $fiche->indicateurs()->pluck('id')->all();
        $principal = $data['indicateur_principal_id'] ?? null;
        $aNePasDegrader = array_map('intval', $data['indicateurs_a_ne_pas_degrader'] ?? []);

        if (($principal !== null && ! in_array((int) $principal, $ids, true)) || array_diff($aNePasDegrader, $ids) !== []) {
            throw RegleMetierException::conditionsManquantes('Indicateur invalide.', ['Les KPI doivent être choisis parmi les indicateurs de la section 3.']);
        }

        // Les rôles des indicateurs se choisissent en section 3 ; ils ne changent ici que s'ils sont envoyés.
        if (array_key_exists('indicateur_principal_id', $data)) {
            foreach ($fiche->indicateurs()->get() as $indicateur) {
                $estPrincipal = $principal !== null && $indicateur->id === (int) $principal;
                $indicateur->update([
                    'principal' => $estPrincipal,
                    'a_ne_pas_degrader' => ! $estPrincipal && in_array($indicateur->id, $aNePasDegrader, true),
                ]);
            }
        }

        if (array_key_exists('chef_pertinence_id', $data)) {
            if ($data['chef_pertinence_id'] !== null && (int) $data['chef_pertinence_id'] !== $fiche->chef_pertinence_id) {
                $this->exigerChefDisponible($fiche, (int) $data['chef_pertinence_id']);
            }
            $fiche->chef_pertinence_id = $data['chef_pertinence_id'];
        }

        $fiche->fill(collect($data)->only(['objectif_smart', 'perimetre', 'resultats_attendus'])->all());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function section5(FicheA3 $fiche, array $data): void
    {
        $this->exigerValeurListe('methode_analyse', $data['methode_analyse'] ?? null);
        $fiche->fill(collect($data)->only(['methode_analyse', 'methode_precision'])->all());
        $prochainNumero = (int) $fiche->causes()->max('numero') + 1;

        $this->sync($fiche->causes(), $data['causes'], 'cause', function (array $item, ?Model $existing) use ($fiche, &$prochainNumero): Model {
            $this->exigerValeurListe('categorie_cause', $item['categorie']);

            return $this->saveRow($fiche->causes(), $existing, [
                ...collect($item)->only(['categorie', 'libelle', 'niveau', 'preuve'])->all(),
                'racine' => (bool) ($item['racine'] ?? false),
                'numero' => $existing?->numero ?? $prochainNumero++,
            ]);
        });

        // Numéros continus 1, 2, 3… dans l'ordre de saisie, même après une suppression.
        foreach ($fiche->causes()->orderBy('numero')->orderBy('id')->get() as $index => $cause) {
            if ($cause->numero !== $index + 1) {
                $cause->update(['numero' => $index + 1]);
            }
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function section6(FicheA3 $fiche, array $data): void
    {
        $causes = $fiche->causes()->pluck('id')->all();
        $risques = $fiche->risques()->pluck('id')->all();

        $this->sync($fiche->actions()->whereNull('action_origine_id'), $data['actions'], 'action', function (array $item, ?Model $existing) use ($fiche, $causes, $risques): Model {
            $this->exigerValeurListe('type_action', $item['type_action']);
            if (! in_array((int) $item['cause_id'], $causes, true)) {
                throw RegleMetierException::conditionsManquantes('Cause invalide.', ['Chaque action est rattachée à une cause de la section 5.']);
            }
            if (($item['risque_id'] ?? null) !== null && ! in_array((int) $item['risque_id'], $risques, true)) {
                throw RegleMetierException::conditionsManquantes('Risque invalide.', ['Le MOC lié doit être un risque de la section 7.']);
            }

            // Une action réalisée ou annulée (boucle précédente) est un fait : elle ne se réécrit plus.
            if ($existing !== null && in_array($existing->statut, StatutAction::terminees(), true)) {
                return $existing;
            }

            /** @var ActionA3 $action */
            $action = $existing ?? new ActionA3(['fiche_id' => $fiche->id, 'statut' => StatutAction::AFaire->value]);
            $action->fill([
                ...collect($item)->only(['cause_id', 'description', 'type_action', 'responsable_id', 'echeance', 'risque_id', 'critere_efficacite'])->all(),
                'cout_estime' => (int) ($item['cout_estime'] ?? 0),
            ])->save();

            return $action;
        }, function (Model $action): void {
            if (in_array($action->statut, StatutAction::terminees(), true)) {
                throw RegleMetierException::conditionsManquantes('Suppression impossible.', ['Une action réalisée ou annulée reste dans la fiche : elle fait partie de son histoire.']);
            }
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function section7(FicheA3 $fiche, array $data): void
    {
        if ($fiche->etape() === StatutEtape::RealisationActions) {
            $this->mettreAJourMoc($fiche, $data['risques']);

            return;
        }

        $codes = collect($data['domaines'])->pluck('domaine')->unique();
        $fiche->domaines()->whereNotIn('domaine', $codes)->delete();

        foreach (collect($data['domaines'])->unique('domaine') as $item) {
            // Les directeurs d'un domaine viennent de la correspondance ; pour « Autres »,
            // le pilote précise le domaine et choisit le directeur qui valide.
            $domaine = Domaine::from($item['domaine']);
            $autres = $domaine === Domaine::Autres;
            $roleCode = $autres ? ($item['valideur_role_code'] ?? null) : null;
            $fiche->domaines()->updateOrCreate(
                ['domaine' => $domaine->value],
                [
                    'valideur_role_id' => $roleCode ? Role::where('code', $roleCode)->value('id') : null,
                    'precision' => $autres ? (trim((string) ($item['precision'] ?? '')) ?: null) : null,
                ],
            );
        }

        $this->sync($fiche->risques(), $data['risques'], 'risque', fn (array $item, ?Model $existing): Model => $this->saveRow($fiche->risques(), $existing, [
            ...collect($item)->only(['domaine', 'description', 'moc_reference', 'moc_statut', 'moc_preuve', 'mesure_maitrise', 'responsable_id'])->all(),
            'moc_requis' => (bool) ($item['moc_requis'] ?? false),
        ]));
    }

    /**
     * Pendant la réalisation, seul le suivi du MOC change (B1).
     *
     * @param  array<int, array<string, mixed>>  $risques
     */
    private function mettreAJourMoc(FicheA3 $fiche, array $risques): void
    {
        foreach ($risques as $item) {
            $risque = isset($item['id']) ? $fiche->risques()->whereKey($item['id'])->first() : null;
            if ($risque === null) {
                throw RegleMetierException::conditionsManquantes('Modification impossible.', ['Pendant la réalisation, seul le suivi des MOC existants est modifiable.']);
            }

            $risque->update(collect($item)->only(['moc_reference', 'moc_statut', 'moc_preuve', 'mesure_maitrise'])->all());
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function section8(FicheA3 $fiche, array $data): void
    {
        // Après T7, la mesure Après et l'objectif sont acquis : seule la saisie du maintien reste ouverte.
        if ($fiche->etape() === StatutEtape::VerificationMaintien) {
            $this->enregistrerMaintien($fiche, $data['maintien'] ?? []);

            return;
        }

        $indicateurs = $fiche->indicateurs()->get()->keyBy('id');
        foreach ($data['mesures'] as $item) {
            $indicateur = $indicateurs->get((int) $item['indicateur_id']);
            if ($indicateur === null) {
                throw RegleMetierException::conditionsManquantes('Indicateur invalide.', ['Les mesures portent sur les indicateurs de la section 3.']);
            }

            $this->enregistrerMesure($indicateur, 'APRES', $item['valeur'] ?? null, $item['date_mesure'] ?? null, $item['periode_verification'] ?? null, $item['commentaire'] ?? null);
        }

        $fiche->fill(collect($data)->only(['objectif_atteint', 'ecart_objectif'])->all());
        if ($fiche->objectif_atteint === 'OUI' && $this->workflow->cibleTenueApres($fiche) === false) {
            throw RegleMetierException::conditionsManquantes('Objectif incohérent.', ['« Oui » est impossible : la valeur Après du KPI principal n’atteint pas sa cible. Choisissez « Partiellement » ou « Non ».']);
        }
        $this->enregistrerMaintien($fiche, $data['maintien'] ?? []);
    }

    /**
     * Mesures de maintien du KPI principal à J+30, J+60 et J+90 de la mesure des résultats,
     * pendant la vérification du maintien, une fois leur date arrivée.
     *
     * @param  array<int, array<string, mixed>>  $items
     */
    private function enregistrerMaintien(FicheA3 $fiche, array $items): void
    {
        $items = array_values(array_filter($items, fn (array $item) => ($item['valeur'] ?? null) !== null && $item['valeur'] !== ''));
        if ($items === []) {
            return;
        }

        $principal = $fiche->indicateurs()->where('principal', true)->first();
        if ($fiche->etape() !== StatutEtape::VerificationMaintien || $principal === null || $fiche->date_resultats === null) {
            throw RegleMetierException::conditionsManquantes('Maintien impossible.', ['Les mesures de maintien se saisissent pendant la vérification du maintien, sur le KPI principal.']);
        }

        foreach ($items as $item) {
            $jours = ['J30' => 30, 'J60' => 60, 'J90' => 90][$item['jalon']];
            $echeance = $fiche->date_resultats->copy()->addDays($jours);
            if ($echeance->isAfter(today())) {
                throw RegleMetierException::conditionsManquantes('Mesure pas encore disponible.', ['La mesure J+'.$jours.' se saisit à partir du '.$echeance->format('d/m/Y').'.']);
            }

            $type = 'MAINTIEN_'.$item['jalon'];
            $principal->mesures()->updateOrCreate(['type' => $type], [
                'valeur' => $item['valeur'],
                'date_mesure' => $item['date_mesure'] ?? today()->toDateString(),
                'commentaire' => $item['commentaire'] ?? null,
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function section9(FicheA3 $fiche, array $data): void
    {
        $sansGain = (bool) ($data['sans_gain_chiffre'] ?? false);
        if ($sansGain && $data['gains'] !== []) {
            throw RegleMetierException::conditionsManquantes('Gains incohérents.', ['Retirer les lignes de gain ou décocher « sans gain chiffré ».']);
        }

        $this->sync($fiche->gains(), $data['gains'], 'gain', function (array $item, ?Model $existing) use ($fiche): Model {
            if ($existing?->statut === 'VALIDE') {
                return $existing;
            }
            $this->exigerValeurListe('categorie_gain', $item['categorie']);

            // Montant annuel saisi par le pilote : aucun calcul automatique.
            return $this->saveRow($fiche->gains(), $existing, [
                ...collect($item)->only(['categorie', 'hypothese_calcul', 'montant_annuel'])->all(),
                'statut' => 'PROPOSE',
                'valide_par_id' => null,
                'date_validation' => null,
            ]);
        }, function (Model $gain): void {
            if ($gain->statut === 'VALIDE') {
                throw RegleMetierException::conditionsManquantes('Suppression impossible.', ['Un gain validé par le Contrôle de gestion ne peut pas être supprimé.']);
            }
        });

        $fiche->sans_gain_chiffre = $sansGain;
        $fiche->cout_mise_en_oeuvre_b = (int) ($data['cout_mise_en_oeuvre_b'] ?? 0);
        // Gain net et délai de retour saisis par le pilote, comme sur la fiche papier : aucun calcul.
        $fiche->gain_net_annuel = $sansGain ? null : ($data['gain_net_annuel'] ?? null);
        $fiche->payback_mois = $sansGain ? null : ($data['payback_mois'] ?? null);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function section10(FicheA3 $fiche, array $data): void
    {
        $this->sync($fiche->perennisations(), $data['perennisation'], 'action de pérennisation', function (array $item, ?Model $existing) use ($fiche): Model {
            $this->exigerValeurListe('type_perennisation', $item['type']);

            return $this->saveRow($fiche->perennisations(), $existing, collect($item)->only(['type', 'responsable_id', 'date', 'statut', 'preuve'])->all());
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function section11(FicheA3 $fiche, array $data): void
    {
        foreach (FicheSectionRules::RUBRIQUES_LECONS as $rubrique) {
            $texte = trim((string) ($data['lecons'][$rubrique] ?? ''));
            if ($texte === '') {
                $fiche->lecons()->where('rubrique', $rubrique)->delete();
            } else {
                $fiche->lecons()->updateOrCreate(['rubrique' => $rubrique], ['texte' => $texte]);
            }
        }
    }

    /**
     * Met à jour la ligne existante ou en crée une : l'identifiant n'est jamais écrit.
     *
     * @param  HasMany<Model, FicheA3>  $relation
     * @param  array<string, mixed>  $attributes
     */
    private function saveRow(HasMany $relation, ?Model $existing, array $attributes): Model
    {
        if ($existing !== null) {
            $existing->update($attributes);

            return $existing;
        }

        return $relation->create($attributes);
    }

    private function enregistrerMesure(FicheA3Indicateur $indicateur, string $type, mixed $valeur, ?string $date = null, ?string $periode = null, ?string $commentaire = null): void
    {
        if ($valeur === null || $valeur === '') {
            $indicateur->mesures()->where('type', $type)->delete();

            return;
        }

        $indicateur->mesures()->updateOrCreate(['type' => $type], [
            'valeur' => $valeur,
            'date_mesure' => $date,
            'periode_verification' => $periode,
            'commentaire' => $commentaire,
        ]);
    }

    /**
     * Synchronise un tableau de la fiche : met à jour les lignes connues, crée les nouvelles
     * et retire celles absentes du formulaire tant qu'aucune donnée ne s'y rattache.
     *
     * @param  HasMany<Model, FicheA3>  $relation
     * @param  array<int, array<string, mixed>>  $items
     * @param  callable(array<string, mixed>, ?Model): Model  $save
     * @param  (callable(Model): void)|null  $beforeDelete
     */
    private function sync(HasMany $relation, array $items, string $libelle, callable $save, ?callable $beforeDelete = null): void
    {
        $existants = (clone $relation)->get()->keyBy('id');
        $conserves = [];

        foreach ($items as $item) {
            $id = isset($item['id']) ? (int) $item['id'] : null;
            if ($id !== null && ! $existants->has($id)) {
                throw RegleMetierException::conditionsManquantes('Ligne inconnue.', ["Ce(tte) {$libelle} n’appartient pas à la fiche."]);
            }

            $conserves[] = $save($item, $id !== null ? $existants->get($id) : null)->getKey();
        }

        foreach ($existants->except($conserves) as $model) {
            if ($beforeDelete !== null) {
                $beforeDelete($model);
            }

            try {
                DB::transaction(fn () => $model->delete());
            } catch (QueryException) {
                throw RegleMetierException::conditionsManquantes('Suppression impossible.', ["Ce(tte) {$libelle} est utilisé(e) ailleurs dans la fiche (action, contrôle ou mesure)."]);
            }
        }
    }

    private function exigerValeurListe(string $liste, ?string $code): void
    {
        if ($code === null || $code === '') {
            return;
        }

        if (! ValeurListe::query()->where('code', $code)->deLaListe($liste)->exists()) {
            throw RegleMetierException::conditionsManquantes('Valeur invalide.', ["La valeur « {$code} » n’existe pas dans la liste « {$liste} »."]);
        }
    }

    private function exigerIdListe(string $liste, int $id): void
    {
        if (! ValeurListe::query()->whereKey($id)->deLaListe($liste)->exists()) {
            throw RegleMetierException::conditionsManquantes('Valeur invalide.', ["La valeur choisie n’appartient pas à la liste « {$liste} »."]);
        }
    }
}
