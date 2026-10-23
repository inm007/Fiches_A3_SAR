<?php

namespace Database\Seeders;

use App\Models\ActionA3;
use App\Models\Affectation;
use App\Models\Commentaire;
use App\Models\Controle;
use App\Models\DomaineRole;
use App\Models\Equipement;
use App\Models\FicheA3;
use App\Models\JournalAdministration;
use App\Models\Role;
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
use App\Services\RelanceService;
use App\Services\ValidationCircuit;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use RuntimeException;

/**
 * Fiches A3 de démonstration, compte par compte (jamais en production) : chaque agent et chaque
 * pilote a plusieurs fiches à des étapes différentes. Chaque fiche passe par les vrais services
 * (workflow, circuit, actions, contrôles, relances) en avançant dans le temps : les règles B1 à B8
 * sont respectées et l'historique, les validations et les notifications sont réels.
 *
 * Étapes cibles :
 *  SANS_PILOTE        déclarée, l'administrateur n'a pas encore désigné de pilote
 *  REDACTION          pilote désigné, sections 1 et 2 seulement
 *  PERTINENCE         soumise au chef de département (porte 0)
 *  A_REFAIRE          renvoyée par le chef : pertinence à revoir
 *  CLASSEE_CHEF       classée sans suite par le chef à la porte 0
 *  CLASSEE            classée sans suite par l'administrateur (doublon)
 *  EQUIPE             pertinence validée, équipe constituée, analyse commencée
 *  PLAN_PRET          sections 5 à 7 complètes, plan pas encore soumis
 *  ATTENTE_PRODUCTION plan soumis, aucun directeur n'a encore répondu
 *  ATTENTE_DOMAINE    la Production a validé, le directeur du domaine pas encore
 *  REFUSE             plan refusé à la porte 1
 *  MOC_BLOQUE         plan approuvé, une action bloquée par un MOC ouvert
 *  EN_ATTENTE         mise en attente pendant la réalisation
 *  REALISATION        une action réalisée, une autre en retard et relancée
 *  MESURE             actions terminées, résultats à mesurer
 *  NOUVELLE_BOUCLE    objectif non atteint : deuxième boucle (version 2)
 *  VERIF_NON_CONFORME contrôle J+60 non conforme, action corrective en cours
 *  VERIF_J90          J+30 et J+60 conformes, sections 9 à 11 remplies
 *  VALIDATION_CLOTURE clôture soumise, gains à valider par le Contrôle de gestion
 *  ATTENTE_SPONSOR    gains décidés, le sponsor n'a pas encore approuvé
 *  CLOTURE_REFUSEE    le sponsor renvoie la clôture en vérification
 *  CLOTURE            clôturée
 */
class DemoFichesSeeder extends Seeder
{
    use ProfilsDemo;

    /**
     * Compte déclarant => fiches : [titre, unité, équipement, origine, type, domaine, étape cible,
     * début (jours avant aujourd'hui), réalisation des actions (jours avant aujourd'hui), options].
     * Le pilote est celui de l'unité (pilote.demo pour DIST, pilote2.demo pour REF et UTIL) ;
     * un pilote qui déclare pilote lui-même sa fiche.
     *
     * Options : gains [[montant, catégorie, hypothèse]], gains_refuses [index], sans_gain, restreint,
     * sponsor, equipe [comptes], copilote, cg (partage|reattribution).
     *
     * @var array<string, array<int, array<int|string, mixed>>>
     */
    public const array FICHES_PAR_COMPTE = [
        'agent.demo' => [
            ['Fuite récurrente sur la pompe de charge P-201', 'DIST', 'P-201', 'INCIDENT_PRESQUE_ACCIDENT', 'FIABILITE', 'FIABILITE', 'CLOTURE', 175, 150, 'gains' => [[10_500_000, 'ENERGIE_ECONOMISEE', 'Vapeur économisée : −18 % sur un an (4 200 t × 2 500 FCFA)'], [1_900_000, 'MAINTENANCE_EVITEE', 'Deux arrêts non planifiés évités']]],
            ['Standardiser la consignation des vannes motorisées', 'DIST', 'V-310', 'AUDIT', 'ORGANISATION', 'QHSE', 'CLOTURE', 160, 130, 'sans_gain' => true, 'sponsor' => 'direction2.demo'],
            ['Pertes de rendement au four F-101', 'DIST', 'F-101', 'ECART_KPI', 'RENDEMENT', 'PROCEDE', 'ATTENTE_SPONSOR', 140, 110, 'gains' => [[15_300_000, 'PRODUCTION_RECUPEREE', 'Production de gasoil récupérée (850 m³)'], [4_000_000, 'ENERGIE_ECONOMISEE', 'Fuel gaz économisé, estimation non mesurée']], 'gains_refuses' => [1]],
            ['Réduire la consommation de vapeur au rebouilleur E-104', 'DIST', 'E-104', 'ECART_KPI', 'ENERGIE', 'PROCEDE', 'VERIF_J90', 115, 85, 'gains' => [[7_750_000, 'ENERGIE_ECONOMISEE', 'Réduction de 12 % de la vapeur MP']]],
            ['Dépassements de soufre sur le gasoil', 'DIST', 'V-310', 'ECART_KPI', 'QUALITE', 'PROCEDE', 'NOUVELLE_BOUCLE', 80, 40],
            ['Dérive de température en tête de colonne C-101', 'DIST', 'C-101', 'ECART_KPI', 'QUALITE', 'PROCEDE', 'REALISATION', 70, 0, 'sponsor' => 'direction2.demo'],
            ['Transferts perdus entre le laboratoire et le SNCC', 'DIST', null, 'AUDIT', 'QUALITE', 'SURETE_CYBERSECURITE', 'ATTENTE_PRODUCTION', 14, 0],
            ['Bruit anormal sur le dessaleur D-120', 'DIST', 'D-120', 'SUGGESTION_TERRAIN', 'FIABILITE', 'FIABILITE', 'A_REFAIRE', 8, 0],
            ['Éclairage insuffisant sur la passerelle du four', 'DIST', 'F-101', 'SUGGESTION_TERRAIN', 'SECURITE_HSE', 'QHSE', 'SANS_PILOTE', 1, 0],
            ['Fuite sur la pompe de charge P-201 (déclarée deux fois)', 'DIST', 'P-201', 'INCIDENT_PRESQUE_ACCIDENT', 'FIABILITE', 'FIABILITE', 'CLASSEE', 30, 0],
        ],
        'agent2.demo' => [
            ['Arrêts intempestifs de la pompe d’eau de refroidissement', 'UTIL', 'P-650', 'INCIDENT_PRESQUE_ACCIDENT', 'FIABILITE', 'FIABILITE', 'CLOTURE', 170, 140, 'gains' => [[6_200_000, 'MAINTENANCE_EVITEE', 'Quatre arrêts de pompe évités sur un an']], 'sponsor' => 'direction2.demo', 'cg' => 'reattribution'],
            ['Encrassement des échangeurs du train de préchauffe', 'REF', 'E-420', 'INSPECTION', 'FIABILITE', 'INTEGRITE', 'CLOTURE_REFUSEE', 145, 112, 'gains' => [[9_800_000, 'ENERGIE_ECONOMISEE', 'Fuel gaz économisé au four grâce à la préchauffe']]],
            ['Vibrations anormales du compresseur K-301', 'REF', 'K-301', 'INCIDENT_PRESQUE_ACCIDENT', 'FIABILITE', 'FIABILITE', 'VALIDATION_CLOTURE', 130, 100, 'gains' => [[12_400_000, 'MAINTENANCE_EVITEE', 'Révision lourde du compresseur repoussée d’un an']], 'cg' => 'partage', 'sponsor' => 'direction2.demo'],
            ['Corrosion sous calorifuge sur la ligne L-12', 'UTIL', 'L-12', 'INSPECTION', 'INTEGRITE_SURETE', 'INTEGRITE', 'VERIF_NON_CONFORME', 105, 75, 'restreint' => true],
            ['Pertes d’hydrogène à la purge du réacteur R-401', 'REF', 'R-401', 'ECART_KPI', 'RENDEMENT', 'PROCEDE', 'MESURE', 60, 6],
            ['Torchage excessif lors des redémarrages', 'REF', 'R-401', 'RETOUR_D_EXPERIENCE', 'SECURITE_HSE', 'QHSE', 'MOC_BLOQUE', 50, 0, 'sponsor' => 'direction2.demo'],
            ['Pertes de communication de l’automate de la turbine T-02', 'UTIL', 'T-02', 'ECART_KPI', 'FIABILITE', 'SURETE_CYBERSECURITE', 'EN_ATTENTE', 55, 0],
            ['Traitement chimique de l’eau de refroidissement', 'UTIL', 'P-650', 'AUDIT', 'QUALITE', 'QHSE', 'REFUSE', 22, 0],
            ['Givrage de l’aéroréfrigérant A-430 en saison froide', 'REF', 'A-430', 'RETOUR_D_EXPERIENCE', 'FIABILITE', 'INTEGRITE', 'ATTENTE_DOMAINE', 26, 0],
            ['Capteur de pression défaillant sur le ballon B-07', 'UTIL', 'B-07', 'INCIDENT_PRESQUE_ACCIDENT', 'SECURITE_HSE', 'QHSE', 'PERTINENCE', 9, 0],
            ['Repeindre les garde-corps du reformeur', 'REF', null, 'SUGGESTION_TERRAIN', 'ORGANISATION', 'QHSE', 'CLASSEE_CHEF', 11, 0],
            ['Fuite d’huile au palier de la turbine T-02', 'UTIL', 'T-02', 'INSPECTION', 'FIABILITE', 'FIABILITE', 'SANS_PILOTE', 2, 0],
        ],
        'pilote.demo' => [
            ['Réduire le temps de démarrage du four F-101', 'DIST', 'F-101', 'RETOUR_D_EXPERIENCE', 'ENERGIE', 'INTEGRITE', 'CLOTURE', 165, 135, 'gains' => [[5_400_000, 'ENERGIE_ECONOMISEE', 'Deux heures de fuel gaz économisées par démarrage']], 'sponsor' => 'direction2.demo', 'equipe' => ['agent.demo']],
            ['Fiabiliser le compresseur de recyclage K-301 au démarrage', 'REF', 'K-301', 'RETOUR_D_EXPERIENCE', 'FIABILITE', 'FIABILITE', 'REALISATION', 75, 0, 'equipe' => ['agent2.demo'], 'copilote' => 'pilote2.demo'],
            ['Fiabiliser les purgeurs vapeur', 'DIST', 'E-104', 'SUGGESTION_TERRAIN', 'ENERGIE', 'QHSE', 'PLAN_PRET', 16, 0, 'equipe' => ['agent.demo']],
            ['Optimiser le lavage du dessaleur', 'DIST', 'D-120', 'ECART_KPI', 'COUT', 'PROCEDE', 'EQUIPE', 12, 0, 'equipe' => ['agent.demo']],
            ['Réduire les déchets d’emballage du magasin', 'DIST', null, 'SUGGESTION_TERRAIN', 'COUT', 'QHSE', 'PERTINENCE', 4, 0, 'restreint' => true],
        ],
        'pilote2.demo' => [
            ['Réduire la perte de catalyseur au reformeur', 'REF', 'R-401', 'ECART_KPI', 'COUT', 'PROCEDE', 'CLOTURE', 168, 138, 'gains' => [[18_000_000, 'AUTRES', 'Appoint de catalyseur réduit de 30 %'], [2_500_000, 'MAINTENANCE_EVITEE', 'Un nettoyage du réacteur évité']], 'equipe' => ['agent2.demo'], 'copilote' => 'pilote.demo'],
            ['Purges manuelles du ballon d’air comprimé B-07', 'UTIL', 'B-07', 'SUGGESTION_TERRAIN', 'ORGANISATION', 'QHSE', 'VERIF_J90', 100, 70, 'gains' => [[1_200_000, 'ENERGIE_ECONOMISEE', 'Fuites d’air réduites au compresseur']], 'equipe' => ['agent2.demo']],
            ['Démarrage difficile de la pompe P-650 après arrêt', 'UTIL', 'P-650', 'SUGGESTION_TERRAIN', 'FIABILITE', 'FIABILITE', 'REDACTION', 3, 0],
        ],
    ];

    private Carbon $aujourdhui;

    private int $rang = 0;

    public function __construct(
        private readonly FicheWorkflow $workflow,
        private readonly FicheSectionService $sections,
        private readonly ActionService $actions,
        private readonly ValidationCircuit $circuit,
        private readonly HistoryLogger $history,
        private readonly NotificationService $notifications,
        private readonly Organigramme $organigramme,
        private readonly RelanceService $relances,
    ) {}

    public function run(): void
    {
        if (! app()->environment('local')) {
            throw new RuntimeException('Les fiches de démonstration ne sont créées qu’en local.');
        }

        Carbon::setTestNow();
        $this->aujourdhui = Carbon::today();
        $this->jour(200);
        $this->reglerCircuit();

        foreach (self::FICHES_PAR_COMPTE as $declarant => $fiches) {
            foreach ($fiches as $fiche) {
                $this->simuler($declarant, $fiche);
                $this->rang++;
            }
        }

        Carbon::setTestNow();
    }

    /**
     * Réglage du circuit par l'administrateur fonctionnel : la Maintenance valide aussi la
     * fiabilité et l'Inspection l'intégrité, pour que chaque directeur ait des demandes.
     */
    private function reglerCircuit(): void
    {
        $avant = DomaineRole::correspondance();
        foreach (['FIABILITE' => 'VALIDEUR_MAINTENANCE', 'INTEGRITE' => 'VALIDEUR_INSPECTION'] as $domaine => $role) {
            DomaineRole::firstOrCreate(['domaine' => $domaine, 'role_id' => Role::where('code', $role)->value('id')]);
        }
        $this->journal(User::where('identifiant', 'admin-fonctionnel.demo')->value('id'), 'MODIFICATION', 'circuit_validation', ['avant' => $avant, 'apres' => DomaineRole::correspondance()]);
    }

    /**
     * @param  array<int|string, mixed>  $s
     */
    private function simuler(string $declarant, array $s): void
    {
        [$titre, $uniteCode, $equipementCode, $origine, $type, $domaine, $cible, $debut, $realisation] = $s;
        $unite = Unite::where('code', $uniteCode)->firstOrFail();
        $parPilote = str_starts_with($declarant, 'pilote');
        $pilote = $this->profil($parPilote ? $declarant : ($uniteCode === 'DIST' ? 'pilote.demo' : 'pilote2.demo'), 'PILOTE', $unite->id);
        $auteur = $parPilote ? $pilote : $this->profil($declarant, 'AGENT', $unite->id);
        $admin = $this->rang % 2 === 0 ? 'admin-fonctionnel.demo' : 'admin-fonctionnel2.demo';

        // T1 : déclaration. Un pilote de l'unité pilote lui-même la fiche qu'il déclare.
        $this->jour($debut);
        $fiche = $this->workflow->declarer([
            'titre' => $titre,
            'unite_id' => $unite->id,
            'origine_id' => $this->valeurId('origine', $origine),
            'enonce_probleme' => "Constat sur {$titre} : écart observé par l’équipe de quart, répété plusieurs fois sur la période.",
            'equipement_id' => $equipementCode ? Equipement::where('unite_id', $unite->id)->where('code', $equipementCode)->value('id') : null,
            'confidentialite' => ($s['restreint'] ?? false) ? 'RESTREINT' : 'NORMAL',
            'piloter' => $parPilote,
        ], $auteur);

        if ($cible === 'CLASSEE') {
            $this->jour($debut - 2);
            $this->workflow->transition($fiche, ['code' => 'T14', 'motif' => 'Doublon de la fiche sur la fuite de la pompe P-201, déjà traitée.'], $this->profil($admin, 'ADMIN_FONCTIONNEL', null));

            return;
        }

        // L'administrateur fonctionnel, notifié, n'a pas encore désigné de pilote.
        if ($cible === 'SANS_PILOTE') {
            return;
        }

        // L'administrateur désigne le pilote de l'unité ; le pilote renseigne les sections 1 à 4,
        // choisit le chef qui valide la pertinence et soumet la fiche (T0).
        $this->jour($debut - 1);
        if (! $parPilote) {
            $this->designerPilote($fiche, $pilote, $admin);
        }
        if (isset($s['copilote'])) {
            $this->partagerFiche($fiche, $s['copilote'], $admin);
        }
        if ($cible === 'REDACTION') {
            $this->remplirDebut($fiche, $pilote, $type, $origine, $equipementCode, $s, partiel: true);

            return;
        }
        $this->remplirDebut($fiche, $pilote, $type, $origine, $equipementCode, $s);
        $this->workflow->transition($fiche, ['code' => 'T0'], $pilote);

        if ($cible === 'PERTINENCE') {
            $this->jour(0);
            $this->relancerValidation($fiche, 0, $pilote);

            return;
        }

        $this->jour($debut - 2);
        if ($cible === 'A_REFAIRE') {
            $this->deciderActives($fiche, 0, 'REFUSE', 'Le constat est flou : chiffrer la fréquence des alarmes et joindre les relevés avant de resoumettre.');

            return;
        }
        if ($cible === 'CLASSEE_CHEF') {
            $this->deciderActives($fiche, 0, 'REFUSE', 'Hors du périmètre de l’amélioration continue : à traiter dans le plan de peinture annuel.', classer: true);

            return;
        }

        // Le chef choisi valide la pertinence : la fiche passe en cours, l'équipe est constituée.
        $this->deciderActives($fiche, 0, 'VALIDE', 'Idée pertinente : à approfondir avec l’équipe.');
        $fiche->refresh();
        $equipe = $s['equipe'] ?? [];
        if (! $parPilote) {
            $equipe[] = $declarant;
        }
        foreach ($equipe as $membre) {
            $fiche->membres()->syncWithoutDetaching([User::where('identifiant', $membre)->value('id') => ['ajoute_par' => $pilote->userId()]]);
        }
        $membre = $this->profil($equipe[0] ?? 'agent.demo', 'AGENT', $equipe === [] ? null : $unite->id);

        $this->jour($debut - 3);
        if ($cible === 'EQUIPE') {
            $this->remplirCauses($fiche, $pilote);

            return;
        }

        $ids = $this->remplirPlan($fiche, $pilote, $membre, $domaine, $cible === 'MOC_BLOQUE');
        if ($cible === 'PLAN_PRET') {
            return;
        }

        // T3 puis porte 1 : les directeurs reçoivent la demande en même temps.
        $this->jour($debut - 5);
        $this->workflow->transition($fiche, ['code' => 'T3'], $pilote);
        if ($cible === 'ATTENTE_PRODUCTION') {
            $this->jour(1);
            $this->relancerValidation($fiche, 1, $pilote);

            return;
        }

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
        $this->commenter($fiche, $membre, 'L’équipe de quart est informée du plan d’actions.');

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

        if ($cible === 'REALISATION') {
            // L'action du pilote est réalisée ; celle du membre a dépassé son échéance et il est relancé.
            $this->jour($debut - 12);
            $this->actions->changerStatut(ActionA3::findOrFail($ids['actions'][0]), ['statut' => 'EN_COURS'], $pilote);
            $this->jour($debut - 20);
            $this->actions->changerStatut(ActionA3::findOrFail($ids['actions'][1]), ['statut' => 'REALISE', 'preuve' => 'Gamme créée dans la GMAO'], $pilote);
            $this->jour(1);
            $this->relances->relancer(ActionA3::findOrFail($ids['actions'][0]), $pilote);

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

        // Mesure des résultats (B3).
        $this->jour($realisation - 3);
        $principal = $fiche->indicateurs()->where('principal', true)->firstOrFail();
        $boucle = $cible === 'NOUVELLE_BOUCLE';
        $this->sections->enregistrer($fiche, 8, [
            'mesures' => [['indicateur_id' => $principal->id, 'valeur' => $boucle ? 94 : 74, 'date_mesure' => today()->toDateString(), 'periode_verification' => 'Moyenne sur 2 semaines']],
            'objectif_atteint' => $boucle ? 'NON' : 'OUI',
        ], $pilote);

        if ($boucle) {
            // Objectif non atteint : le pilote relance une boucle (T11) et reprend l'analyse.
            $this->jour($realisation - 5);
            $this->workflow->transition($fiche, ['code' => 'T11', 'motif' => 'Objectif non atteint : l’indicateur reste à 94 % pour une cible de 80 %.'], $pilote);
            $this->commenter($fiche, $pilote, 'Deuxième boucle : la cause racine était partiellement traitée, on ajuste la consigne.');

            return;
        }

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

        // J+90 puis T8 et porte 2 : le Contrôle de gestion décide les gains, puis le sponsor.
        $this->enregistrerControles($fiche, $realisation, ['J90' => 'CONFORME'], $pilote);
        $this->mesurerMaintien($fiche, $realisation, 'J90', 74, $pilote);
        $this->jour($realisation - 94);
        $this->workflow->transition($fiche, ['code' => 'T8'], $pilote);
        $this->repartirControleGestion($fiche, $s['cg'] ?? null, $admin);
        if ($cible === 'VALIDATION_CLOTURE') {
            $this->jour(0);
            $this->relancerValidation($fiche, 2, $pilote);

            return;
        }

        $this->jour($realisation - 95);
        $demandeCg = Validation::where('fiche_id', $fiche->id)->where('porte', 2)->where('decision', 'EN_ATTENTE')
            ->whereHas('role', fn ($q) => $q->where('code', ValidationCircuit::CONTROLE_GESTION))->first();
        if ($demandeCg !== null) {
            $controle = $this->profilAffectation(Affectation::where('user_id', $demandeCg->valideur_id)->where('role_id', $demandeCg->role_id)->firstOrFail());
            foreach ($fiche->gains()->orderBy('id')->get() as $index => $gain) {
                $refuse = in_array($index, $s['gains_refuses'] ?? [], true);
                $this->circuit->deciderGain($gain, $refuse ? 'REFUSE' : 'VALIDE', $controle);
            }
            $this->deciderActives($fiche, 2, 'VALIDE', 'Gains vérifiés et cohérents avec les données SAP.', ValidationCircuit::CONTROLE_GESTION);
        }
        if ($cible === 'ATTENTE_SPONSOR') {
            return;
        }

        $this->jour($realisation - 96);
        if ($cible === 'CLOTURE_REFUSEE') {
            $this->deciderActives($fiche, 2, 'REFUSE', 'Le maintien n’est démontré que sur deux mois : prolonger la vérification avant de clôturer.', retour: 'VERIFICATION_MAINTIEN');

            return;
        }
        $this->deciderActives($fiche, 2, 'VALIDE', 'Clôture approuvée. Résultat à partager en revue mensuelle.');
    }

    /**
     * Sections 1 à 4 (1 et 2 seulement pour une fiche en cours de rédaction).
     *
     * @param  array<int|string, mixed>  $s
     */
    private function remplirDebut(FicheA3 $fiche, ActiveProfile $pilote, string $type, string $origine, ?string $equipementCode, array $s, bool $partiel = false): void
    {
        $sponsor = $s['sponsor'] ?? 'direction.demo';
        $this->sections->enregistrer($fiche, 1, [
            'titre' => $fiche->titre,
            'unite_id' => $fiche->unite_id,
            'equipement_id' => $fiche->equipement_id,
            'numero_avis_sap' => $equipementCode ? '10'.(300000 + $fiche->id * 137) : null,
            'numero_ordre_sap' => $equipementCode ? '40'.(500000 + $fiche->id * 241) : null,
            'sponsor_id' => User::where('identifiant', $sponsor)->value('id'),
            'date_lancement' => today()->toDateString(),
            'date_cible' => today()->addDays(120)->toDateString(),
            'type_amelioration' => $type,
            'origine_id' => $this->valeurId('origine', $origine),
            'origine_precision' => null,
        ], $pilote);

        $this->sections->enregistrer($fiche, 2, [
            'contexte' => 'Le phénomène est apparu après le dernier redémarrage et se répète plusieurs fois par mois.',
            'enonce_probleme' => $fiche->enonce_probleme,
            'frequence_id' => $this->valeurId('frequence', 'RECURRENTE'),
            'impacts' => ['HSE' => 'Exposition des opérateurs lors des interventions', 'PRODUCTION' => 'Perte de débit pendant les dérives'],
            'impact_financier_estime' => (5 + ($fiche->id * 7) % 35) * 1_000_000,
        ], $pilote);

        if ($partiel) {
            return;
        }

        $this->sections->enregistrer($fiche, 3, ['indicateurs' => [
            ['libelle' => 'Indicateur principal du phénomène', 'unite_mesure' => '%', 'sens' => 'baisse', 'reference' => 100, 'cible' => 80, 'actuelle' => 100, 'source' => 'SNCC', 'periode' => '3 derniers mois', 'role' => 'PRINCIPAL'],
            ['libelle' => 'Taux de disponibilité de l’équipement', 'unite_mesure' => '%', 'sens' => 'hausse', 'reference' => 92, 'cible' => 95, 'actuelle' => 92, 'source' => 'Tableau de bord', 'periode' => '3 derniers mois', 'role' => 'SUIVI'],
        ]], $pilote);

        $this->sections->enregistrer($fiche, 4, [
            'objectif_smart' => 'Réduire l’indicateur de 20 % d’ici la date cible, sans dégrader la disponibilité.',
            'perimetre' => 'Équipements de l’unité concernés par le constat.',
            'resultats_attendus' => 'Indicateur principal ≤ 80 % pendant trois mois consécutifs.',
            'chef_pertinence_id' => $this->organigramme->chefPropose(User::find($pilote->userId()))
                ?? User::where('identifiant', 'chef.demo')->value('id'),
        ], $pilote);
    }

    private function remplirCauses(FicheA3 $fiche, ActiveProfile $pilote): FicheA3
    {
        return $this->sections->enregistrer($fiche, 5, ['methode_analyse' => '5_POURQUOI', 'methode_precision' => null, 'causes' => [
            ['categorie' => 'MATERIEL', 'libelle' => 'Usure prématurée des garnitures', 'niveau' => 1, 'racine' => false, 'preuve' => 'Rapport d’expertise'],
            ['categorie' => 'METHODE', 'libelle' => 'Aucun plan d’inspection préventive', 'niveau' => 2, 'racine' => true, 'preuve' => 'Revue de la GMAO'],
        ]], $pilote);
    }

    /**
     * Sections 5 à 7 : de quoi satisfaire B2.
     *
     * @return array{risque: int, actions: array<int, int>}
     */
    private function remplirPlan(FicheA3 $fiche, ActiveProfile $pilote, ActiveProfile $membre, string $domaine, bool $mocSurDeuxiemeAction): array
    {
        $fiche = $this->remplirCauses($fiche, $pilote);

        $fiche = $this->sections->enregistrer($fiche, 7, [
            'domaines' => [['domaine' => 'PRODUCTION'], ['domaine' => $domaine]],
            'risques' => [['domaine' => $domaine, 'description' => 'Modification des conditions opératoires', 'moc_requis' => true, 'moc_statut' => 'OUVERT', 'moc_reference' => null, 'moc_preuve' => null, 'mesure_maitrise' => 'Analyse de risque avant intervention', 'responsable_id' => $pilote->userId()]],
        ], $pilote);

        $causes = $fiche->causes()->orderBy('numero')->pluck('id')->all();
        $risque = $fiche->risques()->value('id');
        $fiche = $this->sections->enregistrer($fiche, 6, ['actions' => [
            ['cause_id' => $causes[0], 'description' => 'Remplacer les garnitures et contrôler l’alignement', 'type_action' => 'CORRECTIVE', 'responsable_id' => $membre->userId(), 'echeance' => today()->addDays(30)->toDateString(), 'cout_estime' => 1_800_000, 'risque_id' => $mocSurDeuxiemeAction ? null : $risque, 'critere_efficacite' => 'Plus aucune fuite constatée en ronde pendant un mois'],
            ['cause_id' => $causes[1], 'description' => 'Créer le plan d’inspection préventive dans la GMAO', 'type_action' => 'PREVENTIVE', 'responsable_id' => $pilote->userId(), 'echeance' => today()->addDays(45)->toDateString(), 'cout_estime' => 1_400_000, 'risque_id' => $mocSurDeuxiemeAction ? $risque : null, 'critere_efficacite' => 'Inspections planifiées et réalisées à la date prévue'],
        ]], $pilote);

        return ['risque' => $risque, 'actions' => $fiche->actions()->orderBy('id')->pluck('id')->all()];
    }

    /**
     * Sections 9 à 11 : gains saisis à la main, pérennisation, leçons apprises.
     *
     * @param  array<int|string, mixed>  $s
     */
    private function remplirCloture(FicheA3 $fiche, ActiveProfile $pilote, array $s): void
    {
        $this->jour($s[8] - 62);
        $sansGain = (bool) ($s['sans_gain'] ?? false);
        $gains = $sansGain ? [] : ($s['gains'] ?? [[3_000_000, 'MAINTENANCE_EVITEE', 'Interventions correctives évitées sur l’équipement']]);
        $this->sections->enregistrer($fiche, 9, [
            'gains' => array_map(fn (array $g) => ['categorie' => $g[1], 'hypothese_calcul' => $g[2], 'montant_annuel' => $g[0]], $gains),
            'cout_mise_en_oeuvre_b' => 3_200_000,
            'sans_gain_chiffre' => $sansGain,
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
    private function designerPilote(FicheA3 $fiche, ActiveProfile $pilote, string $admin): void
    {
        $adminId = User::where('identifiant', $admin)->value('id');
        $fiche->update(['pilote_id' => $pilote->userId()]);
        $this->history->log($fiche, $adminId, 'DESIGNATION_PILOTE', 'pilote_id', null, $pilote->userId(), 'Pilote de l’unité désigné par l’administrateur fonctionnel');
        $this->notifications->notify([$pilote->userId()], $fiche, 'DESIGNATION_PILOTE', 'Vous êtes désigné pilote de cette fiche.', auteurId: $adminId);
        $this->journal($adminId, 'MODIFICATION', 'fiche_a3:'.$fiche->id, ['pilote_id' => $pilote->userId()]);
    }

    /**
     * Partage de la fiche avec un second pilote de l'unité, comme depuis l'écran d'administration.
     */
    private function partagerFiche(FicheA3 $fiche, string $copilote, string $admin): void
    {
        $adminId = User::where('identifiant', $admin)->value('id');
        $userId = User::where('identifiant', $copilote)->value('id');
        $motif = 'Expertise du second pilote sur cet équipement.';
        $fiche->copilotes()->attach($userId, ['ajoute_par' => $adminId, 'motif' => $motif]);
        $this->history->log($fiche, $adminId, 'PARTAGE_FICHE', 'copilote', null, $userId, $motif);
        $this->notifications->notify([$userId], $fiche, 'PARTAGE_FICHE', 'La fiche est partagée avec vous : vous la poursuivez avec le pilote.', auteurId: $adminId);
        $this->journal($adminId, 'PARTAGE_FICHE', 'fiche_a3:'.$fiche->id, ['copilote' => $userId, 'motif' => $motif]);
    }

    /**
     * Le second contrôleur de gestion reprend une demande : partagée (absence) ou réattribuée.
     */
    private function repartirControleGestion(FicheA3 $fiche, ?string $mode, string $admin): void
    {
        $demande = Validation::where('fiche_id', $fiche->id)->where('porte', 2)->where('decision', 'EN_ATTENTE')
            ->whereHas('role', fn ($q) => $q->where('code', ValidationCircuit::CONTROLE_GESTION))->first();
        if ($mode === null || $demande === null) {
            return;
        }

        $adminId = User::where('identifiant', $admin)->value('id');
        $controle2 = User::where('identifiant', 'controle2.demo')->value('id');
        if ($mode === 'partage') {
            $this->circuit->partager($demande, $controle2, $adminId, 'Congés de la titulaire : demande partagée.');
            $this->journal($adminId, 'PARTAGE_VALIDATION', 'validation:'.$demande->id, ['valideur' => $controle2]);
        } else {
            $this->circuit->reattribuer($demande, $controle2, $adminId, 'Portefeuille Utilités repris par le second contrôleur.');
            $this->journal($adminId, 'REATTRIBUTION_VALIDATION', 'validation:'.$demande->id, ['valideur' => $controle2]);
        }
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
    private function deciderActives(FicheA3 $fiche, int $porte, string $decision, string $commentaire, ?string $seulRole = null, bool $classer = false, ?string $retour = null): void
    {
        $fiche->refresh();
        $demandes = Validation::where('fiche_id', $fiche->id)->where('porte', $porte)->where('decision', 'EN_ATTENTE')->with('role')->get()
            ->filter(fn (Validation $validation) => $this->circuit->estActionnable($validation, $fiche)
                && ($seulRole === null || $validation->role->code === $seulRole));

        foreach ($demandes as $validation) {
            $affectation = Affectation::where('user_id', $validation->valideur_id)->where('role_id', $validation->role_id)->firstOrFail();
            $this->workflow->decider($validation, $decision, $commentaire, $retour, $this->profilAffectation($affectation), classer: $classer);

            if ($decision === 'REFUSE') {
                return;
            }
        }
    }

    /**
     * Relance manuelle, par le pilote, de la demande en attente d'une porte.
     */
    private function relancerValidation(FicheA3 $fiche, int $porte, ActiveProfile $pilote): void
    {
        $demande = Validation::where('fiche_id', $fiche->id)->where('porte', $porte)->where('decision', 'EN_ATTENTE')->orderBy('ordre')->first();
        if ($demande !== null) {
            $this->relances->relancer($demande, $pilote);
        }
    }

    private function commenter(FicheA3 $fiche, ActiveProfile $auteur, string $texte): void
    {
        Commentaire::create(['fiche_id' => $fiche->id, 'auteur_id' => $auteur->userId(), 'contexte' => 'FICHE', 'texte' => $texte]);
    }

    /**
     * @param  array<string, mixed>  $detail
     */
    private function journal(int $auteurId, string $operation, string $objet, array $detail): void
    {
        JournalAdministration::create(['auteur_id' => $auteurId, 'operation' => $operation, 'objet' => $objet, 'detail' => $detail, 'created_at' => now()]);
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
