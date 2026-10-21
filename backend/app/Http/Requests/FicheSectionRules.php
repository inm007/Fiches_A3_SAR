<?php

namespace App\Http\Requests;

use App\Enums\Domaine;
use Illuminate\Validation\Rule;

/**
 * Format des données attendues pour chaque section de la fiche (sections 1 à 11).
 * Ici seulement la forme des champs ; les règles métier sont dans FicheSectionService.
 */
class FicheSectionRules
{
    public const array IMPACTS = ['HSE', 'PRODUCTION', 'QUALITE', 'ENERGIE', 'SURETE'];

    public const array RUBRIQUES_LECONS = ['A_FONCTIONNE', 'N_A_PAS_FONCTIONNE', 'STANDARD_A_REPLIQUER', 'RETOUR_EXPERIENCE', 'PROJET_SUIVANT'];

    /**
     * Règles de validation Laravel des champs envoyés pour une section.
     *
     * @return array<string, mixed>
     */
    public static function pour(int $section): array
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
                'indicateurs.*.role' => ['nullable', Rule::in(['PRINCIPAL', 'A_NE_PAS_DEGRADER', 'SUIVI'])],
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
                'actions.*.critere_efficacite' => ['nullable', 'string', 'max:2000'],
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
                'maintien' => ['nullable', 'array', 'max:3'],
                'maintien.*.jalon' => ['required', Rule::in(['J30', 'J60', 'J90'])],
                'maintien.*.valeur' => ['nullable', 'numeric'],
                'maintien.*.date_mesure' => ['nullable', 'date', 'before_or_equal:today'],
                'maintien.*.commentaire' => ['nullable', 'string', 'max:2000'],
            ],
            9 => [
                'gains' => ['present', 'array', 'max:30'],
                'gains.*.id' => ['nullable', 'integer'],
                'gains.*.categorie' => ['required', 'string', 'max:50'],
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
                'perennisation.*.type' => ['required', 'string', 'max:50'],
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
}
