<?php

namespace Tests\Feature;

use App\Models\ActionA3;
use App\Models\Affectation;
use App\Models\Controle;
use App\Models\EvenementHistorique;
use App\Models\FicheA3;
use App\Models\NotificationInterne;
use App\Models\Validation;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\SimuleFiches;
use Tests\TestCase;

/**
 * Hypothèses du workflow : chaque transition T, chaque règle de blocage B et les cas limites
 * des sections, actions, contrôles et gains (PRD §4 à §8, scénarios A4 à A17).
 */
class ReglesMetierTest extends TestCase
{
    use DatabaseTransactions;
    use SimuleFiches;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpSimulation();
    }

    // ---- B2 et circuit de la porte 1 -------------------------------------------------

    public function test_b2_lists_every_missing_condition_of_an_empty_plan(): void
    {
        $fiche = $this->ficheEnCours();

        $response = $this->transition($fiche, 'PILOTE', 'T3')->assertUnprocessable()->assertJsonPath('code', 'CONDITIONS_MANQUANTES');
        foreach ([
            'Section 1 : type d’amélioration.', 'Section 1 : date cible.', 'Section 2 : contexte.',
            'Section 3 et 4 : indicateur principal.', 'Section 4 : objectif SMART.', 'Section 5 : méthode d’analyse.',
            'Section 5 : au moins une cause.', 'Section 6 : au moins une action rattachée à une cause.',
            'Section 7 : cocher au moins un domaine concerné.',
        ] as $manque) {
            $this->assertContains($manque, $response->json('manques'));
        }
        $this->assertSame('EN_COURS', $fiche->refresh()->statut_etape);
    }

    public function test_b2_requires_a_validator_choice_for_domain_other_and_an_assigned_holder(): void
    {
        $fiche = $this->ficheEnCours();
        $this->completerPlan($fiche);
        $this->section($fiche, 7, ['domaines' => [['domaine' => 'QHSE'], ['domaine' => 'AUTRES']], 'risques' => $this->risquesActuels($fiche)])->assertOk();

        $this->transition($fiche, 'PILOTE', 'T3')->assertUnprocessable()
            ->assertJsonFragment(['Section 7 : choisir le valideur du domaine « Autres ».']);

        // Le valideur choisi pour « Autres » n'a aucun titulaire dans l'unité ni au global.
        Affectation::where('role_id', $this->roleId('VALIDEUR_INSPECTION'))->update(['actif' => false]);
        $this->section($fiche, 7, ['domaines' => [['domaine' => 'QHSE'], ['domaine' => 'AUTRES', 'valideur_role_code' => 'VALIDEUR_INSPECTION']], 'risques' => $this->risquesActuels($fiche)])->assertOk();
        $this->transition($fiche, 'PILOTE', 'T3')->assertUnprocessable()
            ->assertJsonFragment(['Aucun titulaire du rôle « Valideur Inspection / Intégrité » n’est affecté à l’unité de la fiche ni au périmètre global.']);
    }

    public function test_domains_map_to_validators_production_first_and_duplicates_merged(): void
    {
        $fiche = $this->ficheEnCours();
        $this->completerPlan($fiche);
        $this->section($fiche, 7, ['domaines' => [
            ['domaine' => 'PROCEDE'], ['domaine' => 'SURETE_CYBERSECURITE'], ['domaine' => 'FIABILITE'], ['domaine' => 'INTEGRITE'], ['domaine' => 'QHSE'],
        ], 'risques' => $this->risquesActuels($fiche)])->assertOk();

        $this->transition($fiche, 'PILOTE', 'T3')->assertOk();
        $demandes = Validation::where('fiche_id', $fiche->id)->with('role')->get()->mapWithKeys(fn ($v) => [$v->role->code => $v->ordre]);

        $this->assertEquals([
            'VALIDEUR_PRODUCTION' => 1, 'VALIDEUR_PROCEDE' => 2, 'VALIDEUR_MAINTENANCE' => 2, 'VALIDEUR_INSPECTION' => 2, 'VALIDEUR_HSE' => 2,
        ], $demandes->all());
        $this->assertCount(5, $demandes);
        $this->assertTrue(NotificationInterne::where('fiche_id', $fiche->id)->where('user_id', $this->acteurs['VALIDEUR_PRODUCTION'][0]->id)->where('type', 'DEMANDE_VALIDATION')->exists());
        $this->assertFalse(NotificationInterne::where('fiche_id', $fiche->id)->where('user_id', $this->acteurs['VALIDEUR_HSE'][0]->id)->where('type', 'DEMANDE_VALIDATION')->exists());
    }

    // ---- B6, B7, B8 et conflits -------------------------------------------------------

    public function test_b7_validator_cannot_decide_while_fiche_is_on_hold_or_when_not_addressed(): void
    {
        $fiche = $this->ficheEnValidationPlan();
        $production = $this->demande($fiche, 'VALIDEUR_PRODUCTION');

        $this->transition($fiche, 'DIRECTION', 'T12', 'Arbitrage budgétaire')->assertOk();
        $this->decider($production, 'VALIDEUR_PRODUCTION', 'VALIDE')->assertConflict();
        $this->transition($fiche, 'DIRECTION', 'T13')->assertOk()->assertJsonPath('data.statut_etape', 'EN_VALIDATION_PLAN');

        $autreValideur = $this->acteur('VALIDEUR_PRODUCTION', $this->unite->id);
        $this->agirComme($autreValideur)->postJson("/api/validations/{$production->id}/decision", ['decision' => 'VALIDE'])->assertForbidden();

        $this->decider($production, 'VALIDEUR_PRODUCTION', 'VALIDE')->assertOk();
        $this->decider($production, 'VALIDEUR_PRODUCTION', 'VALIDE')->assertConflict();
    }

    public function test_b8_pilot_holding_a_validator_role_is_never_solicited(): void
    {
        [$pilote] = $this->acteurs['PILOTE'];
        Affectation::create(['user_id' => $pilote->id, 'role_id' => $this->roleId('VALIDEUR_PRODUCTION'), 'unite_id' => $this->unite->id, 'actif' => true]);
        Affectation::where('user_id', $this->acteurs['VALIDEUR_PRODUCTION'][0]->id)->update(['actif' => false]);
        Affectation::where('role_id', $this->roleId('VALIDEUR_PRODUCTION'))->where('user_id', '!=', $pilote->id)->update(['actif' => false]);

        $fiche = $this->ficheEnCours();
        $this->completerPlan($fiche);
        $this->transition($fiche, 'PILOTE', 'T3')->assertUnprocessable()
            ->assertJsonFragment(['Aucun titulaire du rôle « Valideur Production / Exploitation » n’est affecté à l’unité de la fiche ni au périmètre global.']);
    }

    public function test_refusal_requires_comment_closes_pending_requests_and_notifies_pilot(): void
    {
        $fiche = $this->ficheEnValidationPlan();
        $this->decider($this->demande($fiche, 'VALIDEUR_PRODUCTION'), 'VALIDEUR_PRODUCTION', 'REFUSE', '   ')->assertUnprocessable()
            ->assertJsonFragment(['B6 : un commentaire est obligatoire pour tout refus.']);
        $this->decider($this->demande($fiche, 'VALIDEUR_PRODUCTION'), 'VALIDEUR_PRODUCTION', 'REFUSE', 'Coût sous-estimé')->assertOk()
            ->assertJsonPath('data.statut_etape', 'EN_COURS');

        $this->assertSame('ANNULE', Validation::where('fiche_id', $fiche->id)->where('role_id', $this->roleId('VALIDEUR_HSE'))->value('decision'));
        $this->assertTrue(NotificationInterne::where('fiche_id', $fiche->id)->where('user_id', $this->acteurs['PILOTE'][0]->id)->where('type', 'REFUS')->exists());
        $this->assertTrue(EvenementHistorique::where('fiche_id', $fiche->id)->where('type', 'REFUS')->where('commentaire', 'Coût sous-estimé')->exists());
    }

    public function test_changed_domain_content_invalidates_its_signature_on_resubmission(): void
    {
        $fiche = $this->ficheEnValidationPlan();
        $this->decider($this->demande($fiche, 'VALIDEUR_PRODUCTION'), 'VALIDEUR_PRODUCTION', 'VALIDE')->assertOk();
        $this->decider($this->demande($fiche, 'VALIDEUR_HSE'), 'VALIDEUR_HSE', 'REFUSE', 'Risque mal décrit')->assertOk();

        // Correction qui touche aussi le plan validé par Production (nouvelle cause).
        $this->section($fiche, 5, ['methode_analyse' => '5_POURQUOI', 'causes' => [
            ...$fiche->causes()->get(['id', 'categorie', 'libelle', 'niveau', 'racine'])->map(fn ($c) => $c->only(['id', 'categorie', 'libelle', 'niveau', 'racine']))->all(),
            ['categorie' => 'MATERIEL', 'libelle' => 'Purgeurs sous-dimensionnés', 'niveau' => 2],
        ]])->assertOk();
        $this->transition($fiche, 'PILOTE', 'T3')->assertOk();

        $this->assertSame(2, Validation::where('fiche_id', $fiche->id)->where('role_id', $this->roleId('VALIDEUR_PRODUCTION'))->count());
        $this->assertSame('EN_ATTENTE', $this->demande($fiche, 'VALIDEUR_PRODUCTION')->decision);
    }

    // ---- B1 et cycle des actions ------------------------------------------------------

    public function test_b1_lists_each_missing_moc_element(): void
    {
        $fiche = $this->declarer();
        $ids = $this->amenerEnRealisation($fiche);
        $action = ActionA3::findOrFail($ids['action']);

        $this->statutAction($action, 'EN_COURS')->assertUnprocessable()
            ->assertJsonFragment(['B1 : référence du MOC manquante (section 7).'])
            ->assertJsonFragment(['B1 : le MOC doit être clôturé (section 7).'])
            ->assertJsonFragment(['B1 : preuve de clôture du MOC manquante (section 7).']);

        // Réaliser directement ne contourne pas B1.
        $this->statutAction($action, 'REALISE')->assertUnprocessable();
    }

    public function test_moc_follow_up_only_during_realisation(): void
    {
        $fiche = $this->declarer();
        $ids = $this->amenerEnRealisation($fiche);

        $this->section($fiche, 7, ['domaines' => [], 'risques' => [['domaine' => 'QHSE', 'description' => 'Nouveau risque']]])
            ->assertUnprocessable()->assertJsonFragment(['Pendant la réalisation, seul le suivi des MOC existants est modifiable.']);
        $this->section($fiche, 6, ['actions' => []])->assertForbidden();
        $this->fermerMoc($fiche, $ids['risque']);
    }

    public function test_action_status_cycle_reasons_block_resume_and_terminal_states(): void
    {
        $fiche = $this->declarer();
        $ids = $this->amenerEnRealisation($fiche);
        $this->fermerMoc($fiche, $ids['risque']);
        $action = ActionA3::findOrFail($ids['action']);

        $this->statutAction($action, 'ANNULE')->assertUnprocessable();
        $this->statutAction($action, 'BLOQUE')->assertUnprocessable();
        $this->statutAction($action, 'EN_COURS')->assertOk();
        $this->statutAction($action, 'BLOQUE', ['motif' => 'Pièce en commande'])->assertOk();
        $this->assertSame('EN_COURS', $action->refresh()->statut_avant_blocage);
        $this->statutAction($action, 'REALISE')->assertConflict();
        $this->statutAction($action, 'REPRENDRE')->assertOk();
        $this->assertSame('EN_COURS', $action->refresh()->statut);

        $this->statutAction($action, 'REALISE', ['date_realisation' => today()->addDay()->toDateString()])->assertUnprocessable();
        $this->statutAction($action, 'REALISE')->assertOk();
        $this->statutAction($action, 'EN_COURS')->assertConflict();
        $this->assertSame(3, Controle::where('action_id', $action->id)->count());
    }

    public function test_t6_requires_every_action_done_and_allows_cancelled_ones(): void
    {
        $fiche = $this->declarer();
        $ids = $this->amenerEnRealisation($fiche);
        $this->fermerMoc($fiche, $ids['risque']);

        $this->transition($fiche, 'PILOTE', 'T6')->assertUnprocessable()
            ->assertJsonFragment(['Action « Remplacer 14 purgeurs » : ni réalisée ni annulée.']);
        $this->statutAction(ActionA3::findOrFail($ids['action']), 'ANNULE', ['motif' => 'Remplacée par un autre chantier'])->assertOk();

        // Un plan entièrement annulé ne montre aucun résultat : la cause racine doit garder une action.
        $this->transition($fiche, 'PILOTE', 'T6')->assertUnprocessable()
            ->assertJsonFragment(['Aucune action réalisée : une fiche dont tout le plan est annulé ne peut pas montrer de résultat. Ajoutez une action ou classez la fiche.'])
            ->assertJsonFragment(['Cause racine n° 1 « Aucun plan d’inspection des purgeurs » : toutes ses actions sont annulées. Ajoutez une action pour la traiter.']);

        [$pilote] = $this->acteurs['PILOTE'];
        $remplacement = $this->agir('PILOTE')->postJson("/api/fiches/{$fiche->id}/actions", [
            'cause_id' => $ids['cause'],
            'description' => 'Planifier la tournée d’inspection des purgeurs',
            'type_action' => 'PREVENTIVE',
            'responsable_id' => $pilote->id,
            'echeance' => today()->addMonth()->toDateString(),
            'critere_efficacite' => 'Tournée faite chaque mois',
            'motif' => 'Remplace le chantier annulé',
        ])->assertOk()->json('data.actions');
        $this->statutAction(ActionA3::findOrFail(collect($remplacement)->firstWhere('statut', '!=', 'ANNULE')['id']), 'REALISE')->assertOk();
        $this->transition($fiche, 'PILOTE', 'T6')->assertOk()->assertJsonPath('data.statut_etape', 'MESURE_RESULTATS');
    }

    // ---- B3, T7, T11 ------------------------------------------------------------------

    public function test_b3_requires_after_measure_of_main_and_non_degradation_kpis(): void
    {
        $fiche = $this->declarer();
        $ids = $this->amenerEnRealisation($fiche);
        $this->fermerMoc($fiche, $ids['risque']);
        $this->statutAction(ActionA3::findOrFail($ids['action']), 'REALISE')->assertOk();
        $this->transition($fiche, 'PILOTE', 'T6')->assertOk();

        // Section 3 n'est plus modifiable : on ajoute le KPI à ne pas dégrader directement.
        $kpi = $fiche->indicateurs()->create(['libelle' => 'Disponibilité', 'unite_mesure' => '%', 'sens' => 'hausse', 'a_ne_pas_degrader' => true]);
        $this->section($fiche, 8, ['mesures' => [['indicateur_id' => $ids['indicateur'], 'valeur' => 70]], 'objectif_atteint' => 'PARTIELLEMENT'])->assertOk();

        $response = $this->transition($fiche, 'PILOTE', 'T7')->assertUnprocessable();
        $this->assertContains('B3 : mesure Après manquante pour « Disponibilité ».', $response->json('manques'));
        $this->assertContains('Section 8 : objectif partiellement atteint, préciser l’écart et la suite donnée.', $response->json('manques'));

        $this->section($fiche, 8, [
            'mesures' => [['indicateur_id' => $ids['indicateur'], 'valeur' => 70], ['indicateur_id' => $kpi->id, 'valeur' => 96]],
            'objectif_atteint' => 'PARTIELLEMENT', 'ecart_objectif' => 'Écart de 5 points, deuxième boucle décidée.',
        ])->assertOk();
        $this->transition($fiche, 'PILOTE', 'T7')->assertOk()->assertJsonPath('data.statut_etape', 'VERIFICATION_MAINTIEN');
    }

    public function test_t11_new_loop_requires_reason_bumps_version_and_requires_new_signatures(): void
    {
        $fiche = $this->declarer();
        $ids = $this->amenerEnRealisation($fiche);
        $this->amenerEnVerification($fiche, $ids, 10);

        $this->transition($fiche, 'PILOTE', 'T11')->assertUnprocessable();
        $this->transition($fiche, 'PILOTE', 'T11', 'Gain non maintenu après le redémarrage')->assertOk()
            ->assertJsonPath('data.statut_etape', 'EN_COURS')->assertJsonPath('data.version', 2);

        $this->transition($fiche, 'PILOTE', 'T3')->assertOk();
        $this->assertSame(2, $this->demande($fiche, 'VALIDEUR_PRODUCTION')->version_fiche);
        $this->assertTrue(EvenementHistorique::where('fiche_id', $fiche->id)->where('type', 'NOUVELLE_VERSION')->exists());
    }

    // ---- Contrôles J+30/60/90 et B4 ---------------------------------------------------

    public function test_controls_are_available_only_at_due_date_and_recorded_once(): void
    {
        $fiche = $this->declarer();
        $ids = $this->amenerEnRealisation($fiche);
        $this->amenerEnVerification($fiche, $ids, 40);
        $controles = Controle::where('action_id', $ids['action'])->get()->keyBy('jalon');

        $this->assertSame(today()->subDays(10)->toDateString(), $controles['J30']->date_echeance->toDateString());
        $this->controle($controles['J60'], 'CONFORME')->assertUnprocessable();
        $this->controle($controles['J30'], 'CONFORME')->assertOk();
        $this->controle($controles['J30'], 'CONFORME')->assertConflict();
        $this->agir('DIRECTION')->patchJson("/api/controles/{$controles['J30']->id}", ['resultat' => 'CONFORME'])->assertForbidden();
    }

    public function test_b4_blocks_closure_until_every_control_and_corrective_check_is_conform(): void
    {
        $fiche = $this->declarer();
        $ids = $this->amenerEnRealisation($fiche);
        $this->amenerEnVerification($fiche, $ids);
        $this->mesurerMaintien($fiche);
        $this->completerCloture($fiche);
        $controles = Controle::where('action_id', $ids['action'])->get()->keyBy('jalon');

        $response = $this->transition($fiche, 'PILOTE', 'T8')->assertUnprocessable();
        $this->assertCount(3, collect($response->json('manques'))->filter(fn ($m) => str_contains($m, 'non renseigné')));

        $this->controle($controles['J30'], 'CONFORME')->assertOk();
        $this->controle($controles['J60'], 'NON_CONFORME')->assertUnprocessable()
            ->assertJsonFragment(['B4 : un contrôle non conforme exige une action corrective (description et échéance).']);
        $this->controle($controles['J60'], 'NON_CONFORME', ['description' => 'Recalibrer le régulateur', 'echeance' => today()->addWeek()->toDateString()])->assertOk();
        $this->controle($controles['J90'], 'CONFORME')->assertOk();

        $corrective = ActionA3::where('action_origine_id', $ids['action'])->firstOrFail();
        $this->assertSame($ids['cause'], $corrective->cause_id);
        $this->statutAction($corrective, 'ANNULE', ['motif' => 'Doublon'])->assertOk();
        $this->transition($fiche, 'PILOTE', 'T8')->assertUnprocessable()
            ->assertJsonFragment(['Action « Remplacer 14 purgeurs » : l’action corrective du contrôle J+60 est annulée.']);
    }

    public function test_corrective_action_is_checked_once_thirty_days_after_its_completion(): void
    {
        $fiche = $this->declarer();
        $ids = $this->amenerEnRealisation($fiche);
        $this->amenerEnVerification($fiche, $ids);
        $this->mesurerMaintien($fiche);
        $this->completerCloture($fiche);
        $controles = Controle::where('action_id', $ids['action'])->get()->keyBy('jalon');
        $this->controle($controles['J30'], 'CONFORME')->assertOk();
        $this->controle($controles['J60'], 'NON_CONFORME', ['description' => 'Recalibrer le régulateur', 'echeance' => today()->toDateString()])->assertOk();
        $this->controle($controles['J90'], 'CONFORME')->assertOk();

        $corrective = ActionA3::where('action_origine_id', $ids['action'])->firstOrFail();
        $this->statutAction($corrective, 'REALISE', ['date_realisation' => today()->subDays(31)->toDateString()])->assertOk();
        $correctif = Controle::where('action_id', $corrective->id)->sole();
        $this->assertSame('CORRECTIF', $correctif->jalon);

        $this->transition($fiche, 'PILOTE', 'T8')->assertUnprocessable();
        $this->controle($correctif, 'CONFORME')->assertOk();
        $this->transition($fiche, 'PILOTE', 'T8')->assertOk()->assertJsonPath('data.statut_etape', 'EN_VALIDATION_CLOTURE');
    }

    public function test_t8_requires_sustainability_lessons_and_gains_or_no_gain_mention(): void
    {
        $fiche = $this->declarer();
        $ids = $this->amenerEnRealisation($fiche);
        $this->amenerEnVerification($fiche, $ids);
        foreach (Controle::where('action_id', $ids['action'])->get() as $controle) {
            $this->controle($controle, 'CONFORME')->assertOk();
        }

        $response = $this->transition($fiche, 'PILOTE', 'T8')->assertUnprocessable();
        foreach (['Section 10 : enregistrer au moins une action de pérennisation.', 'Section 11 : renseigner les leçons apprises.', 'Section 9 : renseigner les gains ou cocher « sans gain chiffré ».'] as $manque) {
            $this->assertContains($manque, $response->json('manques'));
        }
    }

    // ---- Gains, porte 2, B5, T9, T10 --------------------------------------------------

    public function test_gains_are_computed_and_validated_gains_are_locked(): void
    {
        $fiche = $this->declarer();
        $ids = $this->amenerEnRealisation($fiche);
        $this->amenerEnVerification($fiche, $ids);

        $this->section($fiche, 9, ['gains' => [['categorie' => 'AUTRES', 'hypothese_calcul' => 'H', 'quantite' => 1.5, 'unite' => 'u', 'cout_unitaire' => 1001]], 'sans_gain_chiffre' => true])
            ->assertUnprocessable();
        $this->section($fiche, 9, ['gains' => [
            ['categorie' => 'ENERGIE_ECONOMISEE', 'hypothese_calcul' => '−18 %', 'quantite' => 4200, 'unite' => 't', 'cout_unitaire' => 2500],
            ['categorie' => 'AUTRES', 'hypothese_calcul' => 'Arrondi', 'quantite' => 1.5, 'unite' => 'u', 'cout_unitaire' => 1001],
        ], 'cout_mise_en_oeuvre_b' => 0])
            ->assertOk()
            ->assertJsonPath('data.gains.lignes.1.montant_annuel', 1502)
            ->assertJsonPath('data.gains.lignes.0.categorie_libelle', 'Énergie économisée')
            ->assertJsonPath('data.gains.total_a', 10_501_502)
            ->assertJsonPath('data.gains.payback_annees', 0);

        $this->section($fiche, 9, ['gains' => [['categorie' => 'INCONNUE', 'hypothese_calcul' => 'H', 'quantite' => 1, 'unite' => 'u', 'cout_unitaire' => 1]]])
            ->assertUnprocessable()
            ->assertJsonFragment(['La valeur « INCONNUE » n’existe pas dans la liste « categorie_gain ».']);

        $gain = $fiche->gains()->firstOrFail();
        $this->agir('CONTROLE_GESTION')->postJson("/api/gains/{$gain->id}/decision", ['decision' => 'VALIDE'])->assertConflict();
        $gain->update(['statut' => 'VALIDE']);
        $this->section($fiche, 9, ['gains' => [], 'cout_mise_en_oeuvre_b' => 0])->assertUnprocessable()
            ->assertJsonFragment(['Un gain validé par le Contrôle de gestion ne peut pas être supprimé.']);
    }

    public function test_b5_closure_needs_management_control_then_direction_and_refused_gains_leave_the_total(): void
    {
        $fiche = $this->declarer();
        $ids = $this->amenerEnRealisation($fiche);
        $this->amenerEnVerification($fiche, $ids);
        $this->amenerEnValidationCloture($fiche, $ids['action']);
        $this->section($fiche, 9, ['gains' => [], 'cout_mise_en_oeuvre_b' => 0])->assertForbidden();

        $gain = $fiche->gains()->firstOrFail();
        $this->decider($this->demande($fiche, 'DIRECTION'), 'DIRECTION', 'VALIDE')->assertConflict();
        $this->agir('CONTROLE_GESTION')->postJson("/api/gains/{$gain->id}/decision", ['decision' => 'REFUSE'])->assertOk()
            ->assertJsonPath('data.gains.total_a', 0)
            ->assertJsonPath('data.gains.total_a_valide', 0);
        $this->decider($this->demande($fiche, 'CONTROLE_GESTION'), 'CONTROLE_GESTION', 'VALIDE')->assertOk();
        $this->decider($this->demande($fiche, 'DIRECTION'), 'DIRECTION', 'VALIDE')->assertOk()
            ->assertJsonPath('data.statut_etape', 'CLOTURE');
    }

    public function test_without_quantified_gain_only_direction_closes(): void
    {
        $fiche = $this->declarer();
        $ids = $this->amenerEnRealisation($fiche);
        $this->amenerEnVerification($fiche, $ids);
        foreach (Controle::where('action_id', $ids['action'])->get() as $controle) {
            $this->controle($controle, 'CONFORME')->assertOk();
        }
        $this->mesurerMaintien($fiche);
        $this->section($fiche, 9, ['gains' => [], 'sans_gain_chiffre' => true])->assertOk();
        $this->section($fiche, 10, ['perennisation' => [['type' => 'FORMATION', 'statut' => 'REALISE', 'preuve' => 'Feuille de présence']]])->assertOk();
        $this->section($fiche, 11, ['lecons' => ['RETOUR_EXPERIENCE' => 'Partagé en revue']])->assertOk();
        $this->transition($fiche, 'PILOTE', 'T8')->assertOk();

        $this->assertSame(0, Validation::where('fiche_id', $fiche->id)->where('role_id', $this->roleId('CONTROLE_GESTION'))->count());
        $this->decider($this->demande($fiche, 'DIRECTION'), 'DIRECTION', 'VALIDE')->assertOk()->assertJsonPath('data.statut_etape', 'CLOTURE');
    }

    public function test_t10_closure_refusal_returns_to_the_chosen_step(): void
    {
        $fiche = $this->declarer();
        $ids = $this->amenerEnRealisation($fiche);
        $this->amenerEnVerification($fiche, $ids);
        $this->amenerEnValidationCloture($fiche, $ids['action']);

        $this->agir('CONTROLE_GESTION')->postJson('/api/validations/'.$this->demande($fiche, 'CONTROLE_GESTION')->id.'/decision', [
            'decision' => 'REFUSE', 'commentaire' => 'Hypothèse de gain à revoir', 'retour' => 'MESURE_RESULTATS',
        ])->assertOk()->assertJsonPath('data.statut_etape', 'MESURE_RESULTATS');
    }

    // ---- Sections, concurrence, historique --------------------------------------------

    public function test_section_edits_depend_on_the_step_and_keep_referential_integrity(): void
    {
        $fiche = $this->ficheEnCours();
        $this->section($fiche, 8, ['mesures' => [], 'objectif_atteint' => 'OUI'])->assertForbidden();
        $this->section($fiche, 12, [])->assertNotFound();

        $ids = $this->completerPlan($fiche);
        $this->section($fiche, 5, ['methode_analyse' => '5_POURQUOI', 'causes' => []])->assertUnprocessable()
            ->assertJsonFragment(['Ce(tte) cause est utilisé(e) ailleurs dans la fiche (action, contrôle ou mesure).']);
        $this->section($fiche, 4, ['objectif_smart' => 'x', 'indicateur_principal_id' => $ids['indicateur'] + 100000])->assertUnprocessable();
        $this->section($fiche, 6, ['actions' => [['cause_id' => $ids['cause'] + 100000, 'description' => 'x', 'type_action' => 'CORRECTIVE', 'responsable_id' => $this->acteurs['PILOTE'][0]->id, 'echeance' => today()->toDateString()]]])
            ->assertUnprocessable()->assertJsonFragment(['Chaque action est rattachée à une cause de la section 5.']);
        $this->section($fiche, 1, ['titre' => 'T', 'unite_id' => $this->unite->id, 'origine_id' => $this->valeur('origine', 'AUTRE')])->assertUnprocessable()
            ->assertJsonFragment(['Précisez l’origine « Autre ».']);
        $this->section($fiche, 3, ['indicateurs' => [['id' => 999999, 'libelle' => 'x', 'unite_mesure' => 'u', 'sens' => 'hausse']]])->assertUnprocessable();
    }

    public function test_concurrent_transitions_second_one_conflicts(): void
    {
        $fiche = $this->ficheEnCours();
        $this->completerPlan($fiche);

        $this->agir('PILOTE')->postJson("/api/fiches/{$fiche->id}/transitions", ['code' => 'T3', 'etape' => 'EN_COURS'])->assertOk();
        $this->agir('PILOTE')->postJson("/api/fiches/{$fiche->id}/transitions", ['code' => 'T3', 'etape' => 'EN_COURS'])->assertConflict();
        $this->agir('DIRECTION')->postJson("/api/fiches/{$fiche->id}/transitions", ['code' => 'T12', 'etape' => 'EN_COURS', 'motif' => 'x'])->assertConflict();
    }

    public function test_history_is_immutable_even_through_direct_database_queries(): void
    {
        $fiche = $this->declarer();
        $evenement = EvenementHistorique::where('fiche_id', $fiche->id)->firstOrFail();

        try {
            DB::transaction(fn () => DB::table('evenements_historique')->where('id', $evenement->id)->update(['commentaire' => 'falsifié']));
            $this->fail('La base doit refuser UPDATE sur l’historique.');
        } catch (QueryException) {
            $this->assertNotSame('falsifié', EvenementHistorique::find($evenement->id)->commentaire);
        }

        try {
            DB::transaction(fn () => DB::table('evenements_historique')->where('id', $evenement->id)->delete());
            $this->fail('La base doit refuser DELETE sur l’historique.');
        } catch (QueryException) {
            $this->assertNotNull(EvenementHistorique::find($evenement->id));
        }
    }

    public function test_every_status_change_is_traced_with_author_or_system(): void
    {
        $fiche = $this->declarer();
        $this->amenerEnRealisation($fiche);

        $etapes = EvenementHistorique::where('fiche_id', $fiche->id)->where('type', 'CHANGEMENT_STATUT')->orderBy('id')->get();
        $this->assertSame(['OUVERT', 'EN_COURS', 'EN_VALIDATION_PLAN', 'REALISATION_ACTIONS'], $etapes->pluck('nouvel_etat.valeur')->all());
        $this->assertNull($etapes->last()->user_id, 'T4 est enregistré au nom du Système.');
        $this->assertSame($this->acteurs['PILOTE'][0]->id, $etapes[2]->user_id);
    }

    private function ficheEnCours(): FicheA3
    {
        $fiche = $this->declarer();
        $this->designerPilote($fiche);
        $this->transition($fiche, 'PILOTE', 'T2')->assertOk();

        return $fiche;
    }

    private function ficheEnValidationPlan(): FicheA3
    {
        $fiche = $this->ficheEnCours();
        $this->completerPlan($fiche);
        $this->transition($fiche, 'PILOTE', 'T3')->assertOk();

        return $fiche;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function risquesActuels(FicheA3 $fiche): array
    {
        return $fiche->risques()->get()->map(fn ($r) => $r->only(['id', 'domaine', 'description', 'moc_requis', 'moc_statut']))->all();
    }
}
