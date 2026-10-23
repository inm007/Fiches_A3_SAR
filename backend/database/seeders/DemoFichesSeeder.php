<?php

namespace Database\Seeders;

use App\Models\ActionA3;
use App\Models\Affectation;
use App\Models\Commentaire;
use App\Models\Controle;
use App\Models\Equipement;
use App\Models\FicheA3;
use App\Models\Unite;
use App\Models\User;
use App\Models\ValeurListe;
use App\Models\Validation;
use App\Services\ActionService;
use App\Services\ActiveProfile;
use App\Services\FicheSectionService;
use App\Services\FicheWorkflow;
use App\Services\HistoryLogger;
use App\Services\NotificationService;
use App\Services\Organigramme;
use App\Services\ValidationCircuit;
use Illuminate\Database\Seeder;
use Illuminate\Http\Request;
use Illuminate\Session\ArraySessionHandler;
use Illuminate\Session\Store;
use Illuminate\Support\Carbon;
use RuntimeException;

/**
 * Simulation de 16 fiches A3 à des étapes différentes (démonstration, jamais en production).
 * Chaque fiche passe par les vrais services (workflow, circuit, actions, contrôles) en
 * avançant dans le temps : les règles B1 à B8 sont respectées et l'historique est réel.
 */
class DemoFichesSeeder extends Seeder
{
    /**
     * Étapes cibles, dans l'ordre du parcours.
     */
    private const array PARCOURS = [
        'SANS_PILOTE', 'OUVERT', 'BROUILLON', 'PLAN_PRET', 'ATTENTE_PRODUCTION', 'ATTENTE_DOMAINE', 'REFUSE',
        'MOC_BLOQUE', 'EN_ATTENTE', 'MESURE', 'VERIF_J90', 'VERIF_NON_CONFORME', 'VALIDATION_CLOTURE', 'CLOTURE', 'CLASSEE',
    ];

    private Carbon $aujourdhui;

    public function __construct(
        private readonly FicheWorkflow $workflow,
        private readonly FicheSectionService $sections,
        private readonly ActionService $actions,
        private readonly ValidationCircuit $circuit,
        private readonly HistoryLogger $history,
        private readonly NotificationService $notifications,
        private readonly Organigramme $organigramme,
    ) {}

    public function run(): void
    {
        if (! app()->environment('local')) {
            throw new RuntimeException('Les fiches de démonstration ne sont créées qu’en local.');
        }

        Carbon::setTestNow();
        $this->aujourdhui = Carbon::today();

        // S = début (jours avant aujourd'hui), R = réalisation des actions (jours avant aujourd'hui).
        $scenarios = [
            ['Fuite récurrente sur la pompe de charge P-201', 'DIST', 'P-201', 'INCIDENT_PRESQUE_ACCIDENT', 'FIABILITE', 'FIABILITE', 'CLOTURE', 175, 150, 'gains' => [[10_500_000, 'ENERGIE_ECONOMISEE', 'Vapeur économisée : −18 % sur un an (4 200 t × 2 500 FCFA)'], [1_900_000, 'MAINTENANCE_EVITEE', 'Deux arrêts non planifiés évités']]],
            ['Réduire la consommation de vapeur au rebouilleur E-104', 'DIST', 'E-104', 'ECART_KPI', 'ENERGIE', 'PROCEDE', 'CLOTURE', 165, 140, 'gains' => [[7_750_000, 'ENERGIE_ECONOMISEE', 'Réduction de 12 % de la vapeur MP']]],
            ['Standardiser la consignation des vannes motorisées', 'UTIL', 'L-12', 'AUDIT', 'ORGANISATION', 'QHSE', 'CLOTURE', 160, 135, 'sans_gain' => true],
            ['Pertes de rendement au four F-101', 'DIST', 'F-101', 'ECART_KPI', 'RENDEMENT', 'PROCEDE', 'VALIDATION_CLOTURE', 130, 100, 'gains' => [[15_300_000, 'PRODUCTION_RECUPEREE', 'Production de gasoil récupérée (850 m³)']]],
            ['Encrassement des échangeurs du train de préchauffe', 'REF', 'E-420', 'INSPECTION', 'FIABILITE', 'INTEGRITE', 'VERIF_J90', 120, 95],
            ['Vibrations anormales du compresseur K-301', 'REF', 'K-301', 'INCIDENT_PRESQUE_ACCIDENT', 'FIABILITE', 'FIABILITE', 'VERIF_NON_CONFORME', 100, 70],
            ['Dépassements de soufre sur le gasoil', 'DIST', 'V-310', 'ECART_KPI', 'QUALITE', 'PROCEDE', 'MESURE', 60, 6],
            ['Torchage excessif lors des redémarrages', 'REF', 'R-401', 'RETOUR_D_EXPERIENCE', 'SECURITE_HSE', 'QHSE', 'MOC_BLOQUE', 58, 0],
            ['Corrosion sous calorifuge sur la ligne L-12', 'UTIL', 'L-12', 'INSPECTION', 'INTEGRITE_SURETE', 'INTEGRITE', 'EN_ATTENTE', 55, 0, 'restreint' => true],
            ['Fiabiliser les purgeurs vapeur', 'DIST', 'E-104', 'SUGGESTION_TERRAIN', 'ENERGIE', 'QHSE', 'ATTENTE_DOMAINE', 25, 0],
            ['Écart d’analyse de densité au laboratoire', 'REF', null, 'AUDIT', 'QUALITE', 'PROCEDE', 'ATTENTE_PRODUCTION', 12, 0],
            ['Arrêts intempestifs de la pompe d’eau de refroidissement', 'UTIL', 'P-650', 'INCIDENT_PRESQUE_ACCIDENT', 'FIABILITE', 'FIABILITE', 'REFUSE', 20, 0],
            ['Réduire les déchets d’emballage du magasin', 'DIST', null, 'SUGGESTION_TERRAIN', 'COUT', 'QHSE', 'BROUILLON', 9, 0, 'restreint' => true],
            ['Capteur de niveau défaillant sur V-310', 'DIST', 'V-310', 'INCIDENT_PRESQUE_ACCIDENT', 'SECURITE_HSE', 'QHSE', 'OUVERT', 5, 0],
            ['Fuite d’huile au palier de la turbine T-02', 'UTIL', 'T-02', 'INSPECTION', 'FIABILITE', 'FIABILITE', 'SANS_PILOTE', 2, 0],
            ['Fuite sur la pompe de charge P-201 (déclarée deux fois)', 'DIST', 'P-201', 'INCIDENT_PRESQUE_ACCIDENT', 'FIABILITE', 'FIABILITE', 'CLASSEE', 30, 0],
        ];

        foreach ($scenarios as $scenario) {
            $this->simuler($scenario);
        }

        Carbon::setTestNow();
    }

    /**
     * @param  array<int|string, mixed>  $s
     */
    private function simuler(array $s): void
    {
        [$titre, $uniteCode, $equipementCode, $origine, $type, $domaine, $cible, $debut, $realisation] = $s;
        $unite = Unite::where('code', $uniteCode)->firstOrFail();
        $suffixe = $uniteCode === 'DIST' ? '' : '2';
        $agent = $this->profil("agent{$suffixe}.demo", 'AGENT', $unite->id);
        $pilote = $this->profil("pilote{$suffixe}.demo", 'PILOTE', $unite->id);
        $atteint = fn (string $etape): bool => array_search($cible, self::PARCOURS, true) >= array_search($etape, self::PARCOURS, true);

        // T1 : déclaration par l'agent.
        $this->jour($debut);
        $fiche = $this->workflow->declarer([
            'titre' => $titre,
            'unite_id' => $unite->id,
            'origine_id' => $this->valeurId('origine', $origine),
            'enonce_probleme' => "Constat sur {$titre} : écart observé par l’équipe de quart, répété plusieurs fois sur la période.",
            'equipement_id' => $equipementCode ? Equipement::where('unite_id', $unite->id)->where('code', $equipementCode)->value('id') : null,
            'confidentialite' => ($s['restreint'] ?? false) ? 'RESTREINT' : 'NORMAL',
        ], $agent);

        if ($cible === 'CLASSEE') {
            $this->jour($debut - 2);
            $this->workflow->transition($fiche, ['code' => 'T14', 'motif' => 'Doublon de la fiche sur la fuite de la pompe P-201, déjà traitée.'], $this->profil('direction.demo', 'DIRECTION', null));

            return;
        }

        // L'administrateur fonctionnel, notifié, n'a pas encore désigné de pilote.
        if ($cible === 'SANS_PILOTE') {
            return;
        }

        // L'administrateur désigne le pilote de l'unité ; le pilote renseigne les sections 1 à 4,
        // choisit le chef qui valide la pertinence et soumet la fiche (T0).
        $this->jour($debut - 1);
        $this->designerPilote($fiche, $pilote);
        $this->remplirDebut($fiche, $pilote, $type, $origine, $equipementCode);
        $this->workflow->transition($fiche, ['code' => 'T0'], $pilote);
        if ($cible === 'OUVERT') {
            return;
        }

        // Le chef choisi valide la pertinence : la fiche passe en cours, l'équipe est constituée.
        $this->jour($debut - 2);
        $this->deciderActives($fiche, 0, 'VALIDE', 'Idée pertinente : à approfondir avec l’équipe.');
        $fiche->refresh();
        $fiche->membres()->syncWithoutDetaching([$agent->userId() => ['ajoute_par' => $pilote->userId()]]);

        if ($cible === 'BROUILLON') {
            return;
        }

        $this->jour($debut - 3);
        $ids = $this->remplirPlan($fiche, $pilote, $agent, $domaine, $cible === 'MOC_BLOQUE');
        if ($cible === 'PLAN_PRET') {
            return;
        }

        // T3 puis porte 1.
        $this->jour($debut - 5);
        $this->workflow->transition($fiche, ['code' => 'T3'], $pilote);
        if ($cible === 'ATTENTE_PRODUCTION') {
            return;
        }

        // Les directeurs reçoivent la demande en même temps ; la Production répond la première.
        $this->jour($debut - 6);
        $this->deciderActives($fiche, 1, 'VALIDE', 'Plan cohérent avec les contraintes d’exploitation.', 'VALIDEUR_PRODUCTION');
        if ($cible === 'ATTENTE_DOMAINE') {
            return;
        }

        if ($cible === 'REFUSE') {
            $this->jour($debut - 8);
            $this->deciderActives($fiche, 1, 'REFUSE', 'La mesure de maîtrise du risque n’est pas suffisante : préciser la consignation.');
            $this->commenter($fiche, $pilote, 'Je complète la section 7 avec la procédure de consignation et je resoumets.');

            return;
        }

        $this->jour($debut - 7);
        $this->deciderActives($fiche, 1, 'VALIDE', 'Domaine couvert, mesures de maîtrise suffisantes.');
        $this->commenter($fiche, $agent, 'L’équipe de quart est informée du plan d’actions.');

        if ($cible === 'MOC_BLOQUE') {
            $this->jour($debut - 10);
            // L'action sans MOC démarre ; celle soumise au MOC reste bloquée (B1).
            $this->actions->changerStatut(ActionA3::findOrFail($ids['actions'][0]), ['statut' => 'EN_COURS'], $pilote);

            return;
        }

        // Le MOC est clôturé avant le démarrage des actions (B1).
        $this->jour($debut - 8);
        $this->sections->enregistrer($fiche, 7, ['domaines' => [], 'risques' => [[
            'id' => $ids['risque'], 'domaine' => $domaine, 'description' => 'Modification des conditions opératoires',
            'moc_reference' => 'MOC-2026-'.str_pad((string) $fiche->id, 3, '0', STR_PAD_LEFT), 'moc_statut' => 'CLOTURE',
            'moc_preuve' => 'PV de clôture signé', 'mesure_maitrise' => 'Consignation et analyse de risque avant intervention',
        ]]], $pilote);

        if ($cible === 'EN_ATTENTE') {
            $this->jour($debut - 10);
            $this->actions->changerStatut(ActionA3::findOrFail($ids['actions'][0]), ['statut' => 'EN_COURS'], $pilote);
            $this->workflow->transition($fiche, ['code' => 'T12', 'motif' => 'Arrêt programmé de l’unité : intervention reportée à la fin de l’arrêt.'], $pilote);

            return;
        }

        // Réalisation des actions, puis T6.
        $this->jour($realisation);
        foreach ($ids['actions'] as $actionId) {
            $this->actions->changerStatut(ActionA3::findOrFail($actionId), ['statut' => 'REALISE', 'preuve' => 'Ordre SAP soldé et compte rendu d’intervention'], $pilote);
        }
        $this->jour(max($realisation - 1, 0));
        $this->workflow->transition($fiche, ['code' => 'T6'], $pilote);
        if ($cible === 'MESURE') {
            return;
        }

        // Mesure des résultats (B3), puis T7.
        $this->jour($realisation - 3);
        $principal = $fiche->indicateurs()->where('principal', true)->firstOrFail();
        $this->sections->enregistrer($fiche, 8, [
            'mesures' => [['indicateur_id' => $principal->id, 'valeur' => 74, 'date_mesure' => today()->toDateString(), 'periode_verification' => 'Moyenne sur 2 semaines']],
            'objectif_atteint' => 'OUI',
        ], $pilote);
        $this->workflow->transition($fiche, ['code' => 'T7'], $pilote);

        // Contrôles J+30 et J+60 des actions, et maintien du KPI principal.
        $this->enregistrerControles($fiche, $realisation, ['J30' => 'CONFORME'], $pilote);
        $this->mesurerMaintien($fiche, $realisation, 'J30', 76, $pilote);
        if ($cible === 'VERIF_NON_CONFORME') {
            $this->enregistrerControles($fiche, $realisation, ['J60' => 'NON_CONFORME'], $pilote);
            $this->jour(8);
            $corrective = ActionA3::where('fiche_id', $fiche->id)->whereNotNull('action_origine_id')->firstOrFail();
            $this->actions->changerStatut($corrective, ['statut' => 'EN_COURS'], $pilote);

            return;
        }

        $this->enregistrerControles($fiche, $realisation, ['J60' => 'CONFORME'], $pilote);
        $this->mesurerMaintien($fiche, $realisation, 'J60', 75, $pilote);
        $this->remplirCloture($fiche, $pilote, $s);
        if ($cible === 'VERIF_J90') {
            return;
        }

        // J+90 puis T8 et porte 2.
        $this->enregistrerControles($fiche, $realisation, ['J90' => 'CONFORME'], $pilote);
        $this->mesurerMaintien($fiche, $realisation, 'J90', 74, $pilote);
        $this->jour($realisation - 94);
        $this->workflow->transition($fiche, ['code' => 'T8'], $pilote);
        if ($cible === 'VALIDATION_CLOTURE') {
            return;
        }

        $this->jour($realisation - 95);
        $controle = $this->profil('controle.demo', 'CONTROLE_GESTION', null);
        foreach ($fiche->gains()->get() as $gain) {
            $this->circuit->deciderGain($gain, 'VALIDE', $controle);
        }
        $this->deciderActives($fiche, 2, 'VALIDE', 'Gains vérifiés et cohérents avec les données SAP.');
        $this->jour($realisation - 96);
        $this->deciderActives($fiche, 2, 'VALIDE', 'Clôture approuvée. Résultat à partager en revue mensuelle.');
    }

    private function remplirDebut(FicheA3 $fiche, ActiveProfile $initiateur, string $type, string $origine, ?string $equipementCode): void
    {
        $this->sections->enregistrer($fiche, 1, [
            'titre' => $fiche->titre,
            'unite_id' => $fiche->unite_id,
            'equipement_id' => $fiche->equipement_id,
            'numero_avis_sap' => $equipementCode ? '10'.random_int(100000, 999999) : null,
            'numero_ordre_sap' => $equipementCode ? '40'.random_int(100000, 999999) : null,
            'sponsor_id' => User::where('identifiant', 'direction.demo')->value('id'),
            'date_lancement' => today()->toDateString(),
            'date_cible' => today()->addDays(120)->toDateString(),
            'type_amelioration' => $type,
            'origine_id' => $this->valeurId('origine', $origine),
            'origine_precision' => null,
        ], $initiateur);

        $this->sections->enregistrer($fiche, 2, [
            'contexte' => 'Le phénomène est apparu après le dernier redémarrage et se répète plusieurs fois par mois.',
            'enonce_probleme' => $fiche->enonce_probleme,
            'frequence_id' => $this->valeurId('frequence', 'RECURRENTE'),
            'impacts' => ['HSE' => 'Exposition des opérateurs lors des interventions', 'PRODUCTION' => 'Perte de débit pendant les dérives'],
            'impact_financier_estime' => random_int(5, 40) * 1_000_000,
        ], $initiateur);

        $this->sections->enregistrer($fiche, 3, ['indicateurs' => [
            ['libelle' => 'Indicateur principal du phénomène', 'unite_mesure' => '%', 'sens' => 'baisse', 'reference' => 100, 'cible' => 80, 'actuelle' => 100, 'source' => 'SNCC', 'periode' => '3 derniers mois', 'role' => 'PRINCIPAL'],
            ['libelle' => 'Taux de disponibilité de l’équipement', 'unite_mesure' => '%', 'sens' => 'hausse', 'reference' => 92, 'cible' => 95, 'actuelle' => 92, 'source' => 'Tableau de bord', 'periode' => '3 derniers mois', 'role' => 'SUIVI'],
        ]], $initiateur);

        $this->sections->enregistrer($fiche, 4, [
            'objectif_smart' => 'Réduire l’indicateur de 20 % d’ici la date cible, sans dégrader la disponibilité.',
            'perimetre' => 'Équipements de l’unité concernés par le constat.',
            'resultats_attendus' => 'Indicateur principal ≤ 80 % pendant trois mois consécutifs.',
            'chef_pertinence_id' => $this->organigramme->chefPropose(User::find($initiateur->userId()))
                ?? User::where('identifiant', 'chef.demo')->value('id'),
        ], $initiateur);
    }

    /**
     * Sections 5 à 7 : de quoi satisfaire B2.
     *
     * @return array{risque: int, actions: array<int, int>}
     */
    private function remplirPlan(FicheA3 $fiche, ActiveProfile $pilote, ActiveProfile $agent, string $domaine, bool $mocSurDeuxiemeAction): array
    {
        $fiche = $this->sections->enregistrer($fiche, 5, ['methode_analyse' => '5_POURQUOI', 'methode_precision' => null, 'causes' => [
            ['categorie' => 'MATERIEL', 'libelle' => 'Usure prématurée des garnitures', 'niveau' => 1, 'racine' => false, 'preuve' => 'Rapport d’expertise'],
            ['categorie' => 'METHODE', 'libelle' => 'Aucun plan d’inspection préventive', 'niveau' => 2, 'racine' => true, 'preuve' => 'Revue de la GMAO'],
        ]], $pilote);

        $fiche = $this->sections->enregistrer($fiche, 7, [
            'domaines' => [['domaine' => 'PRODUCTION'], ['domaine' => $domaine]],
            'risques' => [['domaine' => $domaine, 'description' => 'Modification des conditions opératoires', 'moc_requis' => true, 'moc_statut' => 'OUVERT', 'moc_reference' => null, 'moc_preuve' => null, 'mesure_maitrise' => 'Analyse de risque avant intervention', 'responsable_id' => $pilote->userId()]],
        ], $pilote);

        $causes = $fiche->causes()->orderBy('numero')->pluck('id')->all();
        $risque = $fiche->risques()->value('id');
        $fiche = $this->sections->enregistrer($fiche, 6, ['actions' => [
            ['cause_id' => $causes[0], 'description' => 'Remplacer les garnitures et contrôler l’alignement', 'type_action' => 'CORRECTIVE', 'responsable_id' => $agent->userId(), 'echeance' => today()->addDays(30)->toDateString(), 'cout_estime' => 1_800_000, 'risque_id' => $mocSurDeuxiemeAction ? null : $risque, 'critere_efficacite' => 'Plus aucune fuite constatée en ronde pendant un mois'],
            ['cause_id' => $causes[1], 'description' => 'Créer le plan d’inspection préventive dans la GMAO', 'type_action' => 'PREVENTIVE', 'responsable_id' => $pilote->userId(), 'echeance' => today()->addDays(45)->toDateString(), 'cout_estime' => 1_400_000, 'risque_id' => $mocSurDeuxiemeAction ? $risque : null, 'critere_efficacite' => 'Inspections planifiées et réalisées à la date prévue'],
        ]], $pilote);

        return ['risque' => $risque, 'actions' => $fiche->actions()->orderBy('id')->pluck('id')->all()];
    }

    /**
     * @param  array<int|string, mixed>  $s
     */
    private function remplirCloture(FicheA3 $fiche, ActiveProfile $pilote, array $s): void
    {
        $this->jour($s[8] - 62);
        $gains = collect($s['gains'] ?? [])->map(fn (array $g) => [
            'categorie' => $g[1], 'hypothese_calcul' => $g[2], 'montant_annuel' => $g[0],
        ])->all();
        $this->sections->enregistrer($fiche, 9, [
            'gains' => $gains,
            'cout_mise_en_oeuvre_b' => 3_200_000,
            'sans_gain_chiffre' => (bool) ($s['sans_gain'] ?? false),
        ], $pilote);
        $this->sections->enregistrer($fiche, 10, ['perennisation' => [
            ['type' => 'SOP', 'responsable_id' => $pilote->userId(), 'date' => today()->toDateString(), 'statut' => 'REALISE', 'preuve' => 'SOP-'.$fiche->id.' révisée'],
            ['type' => 'PLAN_MAINTENANCE', 'responsable_id' => $pilote->userId(), 'date' => today()->toDateString(), 'statut' => 'REALISE', 'preuve' => 'Gamme GMAO créée'],
        ]], $pilote);
        $this->sections->enregistrer($fiche, 11, ['lecons' => [
            'A_FONCTIONNE' => 'L’analyse 5 Pourquoi avec l’équipe de quart.',
            'N_A_PAS_FONCTIONNE' => 'Le délai d’obtention des pièces de rechange.',
            'STANDARD_A_REPLIQUER' => 'Le plan d’inspection préventive sur les équipements similaires.',
        ]], $pilote);
    }

    /**
     * Désignation du pilote par l'administrateur fonctionnel, comme depuis l'écran d'administration.
     */
    private function designerPilote(FicheA3 $fiche, ActiveProfile $pilote): void
    {
        $admin = User::where('identifiant', 'admin-fonctionnel.demo')->value('id');
        $fiche->update(['pilote_id' => $pilote->userId()]);
        $this->history->log($fiche, $admin, 'DESIGNATION_PILOTE', 'pilote_id', null, $pilote->userId(), 'Pilote de l’unité désigné par l’administrateur fonctionnel');
        $this->notifications->notify([$pilote->userId()], $fiche, 'DESIGNATION_PILOTE', 'Vous êtes désigné pilote de cette fiche.', auteurId: $admin);
    }

    /**
     * @param  array<string, string>  $resultats  jalon => CONFORME|NON_CONFORME
     */
    private function enregistrerControles(FicheA3 $fiche, int $realisation, array $resultats, ActiveProfile $pilote): void
    {
        foreach ($resultats as $jalon => $resultat) {
            $this->jour($realisation - (int) substr($jalon, 1));
            $controles = Controle::where('jalon', $jalon)->whereNull('resultat')
                ->whereHas('action', fn ($q) => $q->where('fiche_id', $fiche->id)->whereNull('action_origine_id'))->get();

            foreach ($controles as $index => $controle) {
                $nonConforme = $resultat === 'NON_CONFORME' && $index === 0;
                $this->actions->enregistrerControle($controle, [
                    'resultat' => $nonConforme ? 'NON_CONFORME' : 'CONFORME',
                    'commentaire' => $nonConforme ? 'Dérive constatée : l’indicateur remonte au-dessus de la cible.' : 'Résultat maintenu, constat sur site.',
                    'preuve' => 'Relevé '.$jalon,
                    'action_corrective' => $nonConforme ? ['description' => 'Reprendre le réglage et former l’équipe de quart', 'echeance' => today()->addDays(20)->toDateString(), 'responsable_id' => $pilote->userId()] : null,
                ], $pilote);
            }
        }
    }

    /**
     * Mesure de maintien du KPI principal à J+30, J+60 ou J+90 de la mesure des résultats.
     */
    private function mesurerMaintien(FicheA3 $fiche, int $realisation, string $jalon, float $valeur, ActiveProfile $pilote): void
    {
        $this->jour($realisation - 3 - (int) substr($jalon, 1));
        $this->sections->enregistrer($fiche, 8, [
            'mesures' => [],
            'objectif_atteint' => 'OUI',
            'maintien' => [['jalon' => $jalon, 'valeur' => $valeur, 'date_mesure' => today()->toDateString(), 'commentaire' => 'Moyenne mensuelle relevée au SNCC']],
        ], $pilote);
    }

    /**
     * Décide toutes les demandes actives d'une porte, au nom du valideur sollicité.
     */
    private function deciderActives(FicheA3 $fiche, int $porte, string $decision, string $commentaire, ?string $seulRole = null): void
    {
        $fiche->refresh();
        $demandes = Validation::where('fiche_id', $fiche->id)->where('porte', $porte)->where('decision', 'EN_ATTENTE')->with('role')->get()
            ->filter(fn (Validation $validation) => $this->circuit->estActionnable($validation, $fiche)
                && ($seulRole === null || $validation->role->code === $seulRole));

        foreach ($demandes as $validation) {
            $affectation = Affectation::where('user_id', $validation->valideur_id)->where('role_id', $validation->role_id)->firstOrFail();
            $this->workflow->decider($validation, $decision, $commentaire, null, $this->profilAffectation($affectation));

            if ($decision === 'REFUSE') {
                return;
            }
        }
    }

    private function commenter(FicheA3 $fiche, ActiveProfile $auteur, string $texte): void
    {
        Commentaire::create(['fiche_id' => $fiche->id, 'auteur_id' => $auteur->userId(), 'contexte' => 'FICHE', 'texte' => $texte]);
    }

    private function profil(string $identifiant, string $roleCode, ?int $uniteId): ActiveProfile
    {
        $user = User::where('identifiant', $identifiant)->firstOrFail();
        $affectation = Affectation::where('user_id', $user->id)
            ->whereHas('role', fn ($q) => $q->where('code', $roleCode))
            ->when($uniteId !== null, fn ($q) => $q->where('unite_id', $uniteId))
            ->firstOrFail();

        return $this->profilAffectation($affectation);
    }

    /**
     * Profil actif simulé : une requête avec l'utilisateur et l'affectation en session.
     */
    private function profilAffectation(Affectation $affectation): ActiveProfile
    {
        $user = $affectation->user()->firstOrFail();
        $request = Request::create('/');
        $request->setLaravelSession(new Store('demo', new ArraySessionHandler(30)));
        $request->session()->put('auth.active_assignment_id', $affectation->id);
        $request->setUserResolver(fn () => $user);

        return new ActiveProfile($request);
    }

    private function jour(int $joursAvant): void
    {
        Carbon::setTestNow($this->aujourdhui->copy()->subDays($joursAvant)->setTime(random_int(8, 16), random_int(0, 59)));
    }

    private function valeurId(string $liste, string $code): int
    {
        return ValeurListe::where('code', $code)->whereHas('liste', fn ($q) => $q->where('code', $liste))->value('id')
            ?? throw new RuntimeException("Valeur {$code} absente de la liste {$liste}.");
    }
}
