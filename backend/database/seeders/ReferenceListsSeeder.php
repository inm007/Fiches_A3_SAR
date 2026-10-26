<?php

namespace Database\Seeders;

use App\Models\Liste;
use App\Models\ValeurListe;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ReferenceListsSeeder extends Seeder
{
    public function run(): void
    {
        $lists = [
            'type_amelioration' => [
                'libelle' => 'Types d’amélioration',
                'description' => 'Nature de l’amélioration recherchée.',
                'values' => ['Sécurité/HSE', 'Fiabilité', 'Énergie', 'Rendement', 'Qualité', 'Coût', 'Organisation', 'Intégrité/Sûreté'],
            ],
            'origine' => [
                'libelle' => 'Origines',
                'description' => 'Origine de la fiche A3.',
                'values' => ['Audit', 'Incident/presque-accident', 'Suggestion terrain', 'Écart KPI', 'Inspection', 'Retour d’expérience', 'Autre'],
            ],
            'frequence' => [
                'libelle' => 'Fréquences',
                'description' => 'Fréquence du phénomène.',
                'values' => ['Ponctuelle', 'Quotidienne', 'Hebdomadaire', 'Mensuelle', 'Récurrente'],
            ],
            'methode_analyse' => [
                'libelle' => 'Méthodes d’analyse',
                'description' => 'Méthodes de recherche des causes.',
                'values' => ['5 Pourquoi', 'Ishikawa', 'Pareto', 'Autre'],
            ],
            'categorie_cause' => [
                'libelle' => 'Catégories de cause',
                'description' => 'Catégories d’analyse des causes.',
                'values' => ['Main-d’œuvre', 'Matière', 'Matériel', 'Méthode', 'Milieu', 'Mesure', 'Autres'],
            ],
            'type_action' => [
                'libelle' => 'Types d’action',
                'description' => 'Valeurs provisoires, à valider avec l’amélioration continue.',
                'values' => ['Corrective', 'Préventive', 'Amélioration'],
            ],
            'categorie_gain' => [
                'libelle' => 'Catégories de gain',
                'description' => 'Nature des gains chiffrés (section 9).',
                'values' => [
                    'PRODUCTION_RECUPEREE' => 'Production récupérée',
                    'ENERGIE_ECONOMISEE' => 'Énergie économisée',
                    'MAINTENANCE_EVITEE' => 'Maintenance évitée',
                    'NON_QUALITE_EVITEE' => 'Pertes ou non-qualité évitées',
                    'AUTRES' => 'Autres',
                ],
            ],
            'type_perennisation' => [
                'libelle' => 'Types de pérennisation',
                'description' => 'Moyens de standardiser le résultat (section 10).',
                'values' => [
                    'SOP' => 'SOP',
                    'PARAMETRES' => 'Paramètres',
                    'FORMATION' => 'Formation',
                    'PLAN_MAINTENANCE' => 'Plan de maintenance',
                    'KPI_TABLEAU_DE_BORD' => 'KPI au tableau de bord',
                ],
            ],
            'unite_mesure' => [
                'libelle' => 'Unités de mesure',
                'description' => 'Unités proposées pour les indicateurs (sections 3 et 8).',
                'values' => [
                    'T_H' => 't/h', 'T' => 't', 'T_T' => 't/t', 'M3_H' => 'm³/h', 'KWH' => 'kWh', 'MWH' => 'MWh',
                    'POURCENT' => '%', 'HEURES' => 'h', 'JOURS' => 'jours', 'NOMBRE' => 'nombre', 'FCFA' => 'FCFA',
                    'PPM' => 'ppm', 'DEGRE_C' => '°C', 'BAR' => 'bar', 'KG' => 'kg',
                ],
            ],
            'source_donnees' => [
                'libelle' => 'Sources de données',
                'description' => 'Origine des valeurs des indicateurs (sections 3 et 8).',
                'values' => ['SAP', 'SNCC', 'Relevé terrain', 'Laboratoire', 'Tableau de bord', 'Autre'],
            ],
        ];

        foreach ($lists as $code => $definition) {
            $list = Liste::firstOrCreate(
                ['code' => $code],
                ['libelle' => $definition['libelle'], 'description' => $definition['description']],
            );

            $order = 0;
            foreach ($definition['values'] as $key => $label) {
                $order++;
                $valueCode = is_string($key) ? $key : $this->valueCode($label);
                $this->renameLegacyCode($list, $label, $valueCode);

                ValeurListe::firstOrCreate(
                    ['liste_id' => $list->id, 'code' => $valueCode],
                    ['libelle' => $label, 'ordre' => $order, 'actif' => true],
                );
            }
        }
    }

    private function valueCode(string $label): string
    {
        $normalized = preg_replace('/[^A-Za-z0-9]+/', '_', Str::ascii($label));

        return trim(strtoupper($normalized), '_');
    }

    /**
     * Les premières versions produisaient des codes corrompus par iconv sous Windows
     * (« S_ECURIT_E_HSE »). La valeur existante est renommée pour garder son identifiant.
     */
    private function renameLegacyCode(Liste $list, string $label, string $valueCode): void
    {
        $alreadyCorrect = ValeurListe::query()
            ->where('liste_id', $list->id)
            ->where('code', $valueCode)
            ->exists();

        if ($alreadyCorrect) {
            return;
        }

        ValeurListe::query()
            ->where('liste_id', $list->id)
            ->where('libelle', $label)
            ->update(['code' => $valueCode]);
    }
}
