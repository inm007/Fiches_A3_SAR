<?php

namespace App\Services;

use App\Enums\Domaine;
use App\Enums\StatutEtape;
use App\Exceptions\RegleMetierException;
use App\Models\ActionA3;
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
use Illuminate\Validation\Rule;

/**
 * Enregistrement explicite d'une section par le pilote (PRD §4.2, §4.4).
 * Chaque enregistrement est tracé dans l'historique (PRD §14).
 */
class FicheSectionService
{
    public const array IMPACTS = ['HSE', 'PRODUCTION', 'QUALITE', 'ENERGIE', 'SURETE'];

    public const array CATEGORIES_GAIN = ['PRODUCTION_RECUPEREE', 'ENERGIE_ECONOMISEE', 'MAINTENANCE_EVITEE', 'NON_QUALITE_EVITEE', 'AUTRES'];

    public const array TYPES_PERENNISATION = ['SOP', 'PARAMETRES', 'FORMATION', 'PLAN_MAINTENANCE', 'KPI_TABLEAU_DE_BORD'];

    public const array RUBRIQUES_LECONS = ['A_FONCTIONNE', 'N_A_PAS_FONCTIONNE', 'STANDARD_A_REPLIQUER', 'RETOUR_EXPERIENCE', 'PROJET_SUIVANT'];

    public function __construct(
        private readonly Calculs $calculs,
        private readonly HistoryLogger $history,
    ) {}

    /**
     * Étapes auxquelles le pilote peut enregistrer chaque section.
     *
     * @return array<int, array<int, StatutEtape>>
     */
    public static function etapesEditables(): array
    {
        $suivi = [StatutEtape::RealisationActions, StatutEtape::MesureResultats, StatutEtape::VerificationMaintien];
        $resultats = [StatutEtape::MesureResultats, StatutEtape::VerificationMaintien];

        return [
            1 => [StatutEtape::EnCours],
            2 => [StatutEtape::EnCours],
            3 => [StatutEtape::EnCours],
            4 => [StatutEtape::EnCours],
            5 => [StatutEtape::EnCours],
            6 => [StatutEtape::EnCours],
            7 => [StatutEtape::EnCours, StatutEtape::RealisationActions],
            8 => $resultats,
            9 => $suivi,
            10 => $suivi,
            11 => $resultats,
            12 => [],
        ];
    }

    /**
     * @return array<int, int>
     */
    public function sectionsEditables(FicheA3 $fiche, ActiveProfile $profile): array
    {
        if (! $profile->is('PILOTE') || $fiche->pilote_id !== $profile->userId()) {
            return [];
        }

        return collect(self::etapesEditables())
            ->filter(fn (array $etapes) => in_array($fiche->etape(), $etapes, true))
            ->keys()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public static function rules(int $section): array
    {
        $optionalText = ['nullable', 'string', 'max:5000'];

        return match ($section) {
            1 => [
                'titre' => ['required', 'string', 'max:255'],
                'unite_id' => ['required', 'integer', Rule::exists('unites', 'id')->where('actif', true)],
                'equipement_id' => ['nullable', 'integer', Rule::exists('equipements', 'id')->where('actif', true)],
                'numero_avis_sap' => ['nullable', 'string', 'max:100'],
                'numero_ordre_sap' => ['nullable', 'string', 'max:100'],
                'sponsor_id' => ['nullable', 'integer', Rule::exists('users', 'id')->where('actif', true)],
                'equipe' => ['nullable', 'array', 'max:20'],
                'equipe.*' => ['string', 'max:150'],
                'date_lancement' => ['nullable', 'date'],
                'date_cible' => ['nullable', 'date', 'after_or_equal:date_lancement'],
                'type_amelioration' => ['nullable', 'string', 'max:50'],
                'origine_id' => ['required', 'integer', 'exists:valeurs_listes,id'],
                'origine_precision' => ['nullable', 'string', 'max:255'],
            ],
            2 => [
                'contexte' => $optionalText,
                'enonce_probleme' => ['required', 'string', 'max:5000'],
                'frequence_id' => ['nullable', 'integer', 'exists:valeurs_listes,id'],
                'impacts' => ['nullable', 'array'],
                ...collect(self::IMPACTS)->mapWithKeys(fn (string $type) => ["impacts.{$type}" => $optionalText])->all(),
                'impact_financier_estime' => ['nullable', 'integer', 'min:0'],
            ],
            3 => [
                'indicateurs' => ['present', 'array', 'max:30'],
                'indicateurs.*.id' => ['nullable', 'integer'],
                'indicateurs.*.libelle' => ['required', 'string', 'max:255'],
                'indicateurs.*.unite_mesure' => ['required', 'string', 'max:50'],
                'indicateurs.*.sens' => ['required', Rule::in(['hausse', 'baisse'])],
                'indicateurs.*.source' => ['nullable', 'string', 'max:255'],
                'indicateurs.*.periode' => ['nullable', 'string', 'max:255'],
                'indicateurs.*.reference' => ['nullable', 'numeric'],
                'indicateurs.*.cible' => ['nullable', 'numeric'],
                'indicateurs.*.actuelle' => ['nullable', 'numeric'],
            ],
            4 => [
                'objectif_smart' => $optionalText,
                'perimetre' => $optionalText,
                'resultats_attendus' => $optionalText,
                'indicateur_principal_id' => ['nullable', 'integer'],
                'indicateurs_a_ne_pas_degrader' => ['nullable', 'array'],
                'indicateurs_a_ne_pas_degrader.*' => ['integer'],
            ],
            5 => [
                'methode_analyse' => ['nullable', 'string', 'max:50'],
                'methode_precision' => ['nullable', 'string', 'max:255'],
                'causes' => ['present', 'array', 'max:50'],
                'causes.*.id' => ['nullable', 'integer'],
                'causes.*.categorie' => ['required', 'string', 'max:50'],
                'causes.*.libelle' => ['required', 'string', 'max:2000'],
                'causes.*.niveau' => ['required', 'integer', 'between:1,10'],
                'causes.*.racine' => ['boolean'],
                'causes.*.preuve' => ['nullable', 'string', 'max:2000'],
            ],
            6 => [
                'actions' => ['present', 'array', 'max:100'],
                'actions.*.id' => ['nullable', 'integer'],
                'actions.*.cause_id' => ['required', 'integer'],
                'actions.*.description' => ['required', 'string', 'max:2000'],
                'actions.*.type_action' => ['required', 'string', 'max:50'],
                'actions.*.responsable_id' => ['required', 'integer', Rule::exists('users', 'id')->where('actif', true)],
                'actions.*.echeance' => ['required', 'date'],
                'actions.*.cout_estime' => ['nullable', 'integer', 'min:0'],
                'actions.*.risque_id' => ['nullable', 'integer'],
            ],
            7 => [
                'domaines' => ['present', 'array'],
                'domaines.*.domaine' => ['required', Rule::enum(Domaine::class)],
                'domaines.*.valideur_role_code' => ['nullable', Rule::in(Domaine::rolesValideurs())],
                'risques' => ['present', 'array', 'max:50'],
                'risques.*.id' => ['nullable', 'integer'],
                'risques.*.domaine' => ['required', Rule::enum(Domaine::class)],
                'risques.*.description' => ['required', 'string', 'max:2000'],
                'risques.*.moc_requis' => ['boolean'],
                'risques.*.moc_reference' => ['nullable', 'string', 'max:255'],
                'risques.*.moc_statut' => ['nullable', Rule::in(['A_OUVRIR', 'OUVERT', 'CLOTURE'])],
                'risques.*.moc_preuve' => ['nullable', 'string', 'max:255'],
                'risques.*.mesure_maitrise' => ['nullable', 'string', 'max:2000'],
                'risques.*.responsable_id' => ['nullable', 'integer', Rule::exists('users', 'id')->where('actif', true)],
            ],
            8 => [
                'mesures' => ['present', 'array'],
                'mesures.*.indicateur_id' => ['required', 'integer'],
                'mesures.*.valeur' => ['nullable', 'numeric'],
                'mesures.*.date_mesure' => ['nullable', 'date'],
                'mesures.*.periode_verification' => ['nullable', 'string', 'max:255'],
                'objectif_atteint' => ['nullable', Rule::in(['OUI', 'PARTIELLEMENT', 'NON'])],
                'ecart_objectif' => $optionalText,
            ],
            9 => [
                'gains' => ['present', 'array', 'max:30'],
                'gains.*.id' => ['nullable', 'integer'],
                'gains.*.categorie' => ['required', Rule::in(self::CATEGORIES_GAIN)],
                'gains.*.hypothese_calcul' => ['required', 'string', 'max:2000'],
                'gains.*.quantite' => ['required', 'numeric', 'min:0'],
                'gains.*.unite' => ['required', 'string', 'max:50'],
                'gains.*.cout_unitaire' => ['required', 'integer', 'min:0'],
                'cout_mise_en_oeuvre_b' => ['nullable', 'integer', 'min:0'],
                'sans_gain_chiffre' => ['boolean'],
            ],
            10 => [
                'perennisation' => ['present', 'array', 'max:30'],
                'perennisation.*.id' => ['nullable', 'integer'],
                'perennisation.*.type' => ['required', Rule::in(self::TYPES_PERENNISATION)],
                'perennisation.*.responsable_id' => ['nullable', 'integer', Rule::exists('users', 'id')->where('actif', true)],
                'perennisation.*.date' => ['nullable', 'date'],
                'perennisation.*.statut' => ['required', Rule::in(['A_FAIRE', 'EN_COURS', 'REALISE'])],
                'perennisation.*.preuve' => ['nullable', 'string', 'max:255'],
            ],
            11 => [
                'lecons' => ['present', 'array'],
                ...collect(self::RUBRIQUES_LECONS)->mapWithKeys(fn (string $rubrique) => ["lecons.{$rubrique}" => $optionalText])->all(),
            ],
            default => [],
        };
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
     * @param  array<string, mixed>  $data
     */
    private function section1(FicheA3 $fiche, array $data): void
    {
        $this->exigerValeurListe('type_amelioration', $data['type_amelioration'] ?? null);
        $this->exigerIdListe('origine', $data['origine_id']);

        if (($data['equipement_id'] ?? null) !== null
            && ! Equipement::whereKey($data['equipement_id'])->where('unite_id', $data['unite_id'])->exists()) {
            throw RegleMetierException::conditionsManquantes('Équipement invalide.', ['L’équipement doit appartenir à l’unité de la fiche.']);
        }

        if ($this->codeValeur($data['origine_id']) === 'AUTRE' && blank($data['origine_precision'] ?? null)) {
            throw RegleMetierException::conditionsManquantes('Précision manquante.', ['Préciser l’origine « Autre ».']);
        }

        $fiche->fill(collect($data)->only([
            'titre', 'unite_id', 'equipement_id', 'sponsor_id', 'equipe', 'date_lancement', 'date_cible',
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
     * @param  array<string, mixed>  $data
     */
    private function section2(FicheA3 $fiche, array $data): void
    {
        if (($data['frequence_id'] ?? null) !== null) {
            $this->exigerIdListe('frequence', $data['frequence_id']);
        }

        $fiche->fill(collect($data)->only(['contexte', 'enonce_probleme', 'frequence_id', 'impact_financier_estime'])->all());

        foreach (self::IMPACTS as $type) {
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
        $this->sync($fiche->indicateurs(), $data['indicateurs'], 'indicateur', function (array $item, ?Model $existing) use ($fiche): Model {
            /** @var FicheA3Indicateur $indicateur */
            $indicateur = $existing ?? new FicheA3Indicateur(['fiche_id' => $fiche->id]);
            $indicateur->fill(collect($item)->only(['libelle', 'unite_mesure', 'sens', 'source', 'periode'])->all())->save();

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

        foreach ($fiche->indicateurs()->get() as $indicateur) {
            $estPrincipal = $principal !== null && $indicateur->id === (int) $principal;
            $indicateur->update([
                'principal' => $estPrincipal,
                'a_ne_pas_degrader' => ! $estPrincipal && in_array($indicateur->id, $aNePasDegrader, true),
            ]);
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

        $this->sync($fiche->causes(), $data['causes'], 'cause', function (array $item, ?Model $existing) use ($fiche, $data, &$prochainNumero): Model {
            $this->exigerValeurListe('categorie_cause', $item['categorie']);

            return $this->saveRow($fiche->causes(), $existing, [
                ...collect($item)->only(['categorie', 'libelle', 'niveau', 'preuve'])->all(),
                'racine' => (bool) ($item['racine'] ?? false),
                'methode' => $data['methode_analyse'] ?? 'NON_PRECISEE',
                'numero' => $existing?->numero ?? $prochainNumero++,
            ]);
        });
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

            /** @var ActionA3 $action */
            $action = $existing ?? new ActionA3(['fiche_id' => $fiche->id, 'statut' => 'A_FAIRE']);
            $action->fill([
                ...collect($item)->only(['cause_id', 'description', 'type_action', 'responsable_id', 'echeance', 'risque_id'])->all(),
                'cout_estime' => (int) ($item['cout_estime'] ?? 0),
            ])->save();

            return $action;
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
            $domaine = Domaine::from($item['domaine']);
            $roleCode = $domaine->roleValideur() ?? ($item['valideur_role_code'] ?? null);
            $fiche->domaines()->updateOrCreate(
                ['domaine' => $domaine->value],
                ['valideur_role_id' => $roleCode ? Role::where('code', $roleCode)->value('id') : null],
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
        $indicateurs = $fiche->indicateurs()->get()->keyBy('id');
        foreach ($data['mesures'] as $item) {
            $indicateur = $indicateurs->get((int) $item['indicateur_id']);
            if ($indicateur === null) {
                throw RegleMetierException::conditionsManquantes('Indicateur invalide.', ['Les mesures portent sur les indicateurs de la section 3.']);
            }

            $this->enregistrerMesure($indicateur, 'APRES', $item['valeur'] ?? null, $item['date_mesure'] ?? null, $item['periode_verification'] ?? null);
        }

        $fiche->fill(collect($data)->only(['objectif_atteint', 'ecart_objectif'])->all());
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

            return $this->saveRow($fiche->gains(), $existing, [
                ...collect($item)->only(['categorie', 'hypothese_calcul', 'quantite', 'unite', 'cout_unitaire'])->all(),
                'montant_annuel' => $this->calculs->gainAnnuel((float) $item['quantite'], (int) $item['cout_unitaire']),
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
        $fiche->cout_mise_en_oeuvre_b = (int) ($data['cout_mise_en_oeuvre_b'] ?? $fiche->actions()->sum('cout_estime'));
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function section10(FicheA3 $fiche, array $data): void
    {
        $this->sync($fiche->perennisations(), $data['perennisation'], 'action de pérennisation', fn (array $item, ?Model $existing): Model => $this->saveRow(
            $fiche->perennisations(),
            $existing,
            collect($item)->only(['type', 'responsable_id', 'date', 'statut', 'preuve'])->all(),
        ));
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function section11(FicheA3 $fiche, array $data): void
    {
        foreach (self::RUBRIQUES_LECONS as $rubrique) {
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

    private function enregistrerMesure(FicheA3Indicateur $indicateur, string $type, mixed $valeur, ?string $date = null, ?string $periode = null): void
    {
        if ($valeur === null || $valeur === '') {
            $indicateur->mesures()->where('type', $type)->delete();

            return;
        }

        $indicateur->mesures()->updateOrCreate(['type' => $type], [
            'valeur' => $valeur,
            'date_mesure' => $date,
            'periode_verification' => $periode,
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

        $existe = ValeurListe::query()
            ->where('code', $code)
            ->whereHas('liste', fn ($query) => $query->where('code', $liste))
            ->exists();

        if (! $existe) {
            throw RegleMetierException::conditionsManquantes('Valeur invalide.', ["La valeur « {$code} » n’existe pas dans la liste « {$liste} »."]);
        }
    }

    private function exigerIdListe(string $liste, int $id): void
    {
        $existe = ValeurListe::query()->whereKey($id)->whereHas('liste', fn ($query) => $query->where('code', $liste))->exists();
        if (! $existe) {
            throw RegleMetierException::conditionsManquantes('Valeur invalide.', ["La valeur choisie n’appartient pas à la liste « {$liste} »."]);
        }
    }

    private function codeValeur(int $id): ?string
    {
        return ValeurListe::whereKey($id)->value('code');
    }
}
