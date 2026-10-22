<?php

namespace Tests\Feature;

use App\Models\ActionA3;
use App\Models\Controle;
use App\Models\EvenementHistorique;
use App\Models\FicheA3;
use App\Models\FicheVersion;
use App\Models\Unite;
use App\Models\Validation;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\Concerns\SimuleFiches;
use Tests\TestCase;

/**
 * Cycle de vie renforcé : auto-désignation du pilote, objectif non atteint, nouvelle boucle,
 * maintien du KPI principal, classement sans suite, copies figées, sponsor et prochaine étape.
 */
class CycleA3RenforceTest extends TestCase
{
    use DatabaseTransactions;
    use SimuleFiches;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpSimulation();
    }

    // ---- Déclaration -----------------------------------------------------------------

    public function test_pilot_of_the_unit_pilots_the_fiche_from_its_declaration(): void
    {
        [$pilote] = $this->acteurs['PILOTE'];

        $id = $this->agir('PILOTE')->postJson('/api/fiches', [...$this->declaration(), 'piloter' => true])
            ->assertCreated()
            ->json('data.id');

        $this->assertSame($pilote->id, FicheA3::findOrFail($id)->pilote_id);
        $this->assertTrue(EvenementHistorique::where('fiche_id', $id)->where('type', 'DESIGNATION_PILOTE')->exists());
        $this->transition(FicheA3::findOrFail($id), 'PILOTE', 'T2')->assertUnprocessable();
        $this->pertinenceValidee(FicheA3::findOrFail($id));
        $this->transition(FicheA3::findOrFail($id), 'PILOTE', 'T2')->assertOk();
    }

    public function test_agent_or_pilot_of_another_unit_leaves_the_pilot_choice_to_the_admin(): void
    {
        $this->agir('AGENT')->postJson('/api/fiches', [...$this->declaration(), 'piloter' => true])->assertForbidden();

        $autre = Unite::create(['code' => 'U-'.Str::random(6), 'libelle' => 'Autre unité', 'actif' => true]);
        $this->agir('PILOTE')->postJson('/api/fiches', [...$this->declaration(), 'unite_id' => $autre->id, 'piloter' => true])->assertForbidden();

        $id = $this->agir('PILOTE')->postJson('/api/fiches', [...$this->declaration(), 'unite_id' => $autre->id])->assertCreated()->json('data.id');
        $this->assertNull(FicheA3::findOrFail($id)->pilote_id);
    }

    // ---- Plan, prochaine étape et copie figée ----------------------------------------

    public function test_next_step_lists_what_is_missing_with_where_to_fix_it(): void
    {
        $fiche = $this->declarer();
        $this->designerPilote($fiche);
        $this->transition($fiche, 'PILOTE', 'T2')->assertOk();

        $conditions = collect($this->agir('PILOTE')->getJson("/api/fiches/{$fiche->id}")
            ->assertOk()
            ->assertJsonPath('data.prochaine_etape.code', 'T3')
            ->json('data.prochaine_etape.conditions'));

        $this->assertContains('Section 4 : résultats attendus (conditions de clôture).', $conditions->pluck('message'));
        $this->assertContains('Section 5 : au moins une cause.', $conditions->pluck('message'));
        $this->assertSame(4, $conditions->firstWhere('message', 'Section 4 : résultats attendus (conditions de clôture).')['emplacement']['section']);

        $this->completerPlan($fiche);
        $this->agir('PILOTE')->getJson("/api/fiches/{$fiche->id}")->assertJsonPath('data.prochaine_etape.conditions', []);
    }

    public function test_plan_submission_and_closure_freeze_a_copy_of_the_fiche(): void
    {
        $fiche = $this->declarer();
        $ids = $this->amenerEnRealisation($fiche);

        $copie = FicheVersion::where('fiche_id', $fiche->id)->sole();
        $this->assertSame('SOUMISSION_PLAN', $copie->evenement);
        $this->assertSame('Remplacer 14 purgeurs', $copie->contenu['actions'][0]['description']);
        $this->assertArrayNotHasKey('droits', $copie->contenu);

        $this->amenerEnVerification($fiche, $ids);
        $this->amenerEnValidationCloture($fiche, $ids['action']);
        $this->approuverPorte($fiche, 2);
        $this->decider($this->demande($fiche, 'CONTROLE_GESTION'), 'CONTROLE_GESTION', 'VALIDE');
        $fiche->gains()->update(['statut' => 'VALIDE']);
        $this->approuverPorte($fiche, 2);

        $this->assertSame('CLOTURE', $fiche->refresh()->statut_etape);
        $this->agir('PILOTE')->getJson("/api/fiches/{$fiche->id}/versions")->assertOk()
            ->assertJsonPath('data.0.evenement', 'CLOTURE')
            ->assertJsonPath('data.0.contenu.statut_etape', 'CLOTURE')
            ->assertJsonPath('data.1.evenement', 'SOUMISSION_PLAN');
    }

    // ---- Actions et contrôles --------------------------------------------------------

    public function test_done_action_needs_a_proof_and_a_conform_control_needs_a_comment(): void
    {
        $fiche = $this->declarer();
        $ids = $this->amenerEnRealisation($fiche);
        $action = ActionA3::findOrFail($ids['action']);
        $this->fermerMoc($fiche, $ids['risque']);

        $this->statutAction($action, 'REALISE', ['preuve' => '  '])->assertUnprocessable();
        $this->statutAction($action, 'REALISE', ['preuve' => 'OT 4471 soldé', 'date_realisation' => today()->subDays(100)->toDateString()])->assertOk()
            ->assertJsonPath('data.actions.0.preuve_realisation', 'OT 4471 soldé')
            ->assertJsonPath('data.actions.0.critere_efficacite', 'Aucun purgeur fuyard à la ronde mensuelle');

        $controle = Controle::where('action_id', $action->id)->where('jalon', 'J30')->firstOrFail();
        $this->agir('PILOTE')->patchJson("/api/controles/{$controle->id}", ['resultat' => 'CONFORME'])->assertUnprocessable();
        $this->agir('PILOTE')->patchJson("/api/controles/{$controle->id}", ['resultat' => 'CONFORME', 'commentaire' => 'Ronde du 12 : aucun purgeur fuyard'])->assertOk();
    }

    // ---- Résultats, nouvelle boucle et maintien --------------------------------------

    public function test_unmet_objective_cannot_be_closed_and_calls_for_a_new_loop(): void
    {
        $fiche = $this->declarer();
        $ids = $this->amenerEnRealisation($fiche);
        $this->fermerMoc($fiche, $ids['risque']);
        $this->statutAction(ActionA3::findOrFail($ids['action']), 'REALISE')->assertOk();
        $this->transition($fiche, 'PILOTE', 'T6')->assertOk();

        $this->section($fiche, 8, ['mesures' => [['indicateur_id' => $ids['indicateur'], 'valeur' => 98]]])->assertOk()
            ->assertJsonPath('data.resultats.objectif_suggere', 'PARTIELLEMENT');
        $this->section($fiche, 8, ['mesures' => [['indicateur_id' => $ids['indicateur'], 'valeur' => 98]], 'objectif_atteint' => 'NON'])->assertOk();

        $message = collect($this->transition($fiche, 'PILOTE', 'T7')->assertUnprocessable()->json('manques'))->implode(' ');
        $this->assertStringContainsString('Objectif non atteint', $message);
        $this->assertStringContainsString('nouvelle boucle', $message);
    }

    public function test_new_loop_starts_without_the_results_of_the_previous_one(): void
    {
        $fiche = $this->declarer();
        $ids = $this->amenerEnRealisation($fiche);
        $this->amenerEnVerification($fiche, $ids, 10);
        $this->assertNotNull($fiche->refresh()->date_resultats);

        $this->transition($fiche, 'PILOTE', 'T11', 'Résultat non tenu après le redémarrage')->assertOk()
            ->assertJsonPath('data.version', 2)
            ->assertJsonPath('data.resultats.objectif_atteint', null);

        $fiche->refresh();
        $this->assertNull($fiche->date_resultats);
        $this->assertFalse($fiche->indicateurs()->first()->mesures()->where('type', 'APRES')->exists());
        $this->assertTrue(EvenementHistorique::where('fiche_id', $fiche->id)->where('type', 'REINITIALISATION_MESURE')->exists());
    }

    public function test_closure_needs_the_main_kpi_held_at_30_60_and_90_days(): void
    {
        $fiche = $this->declarer();
        $ids = $this->amenerEnRealisation($fiche);
        $this->amenerEnVerification($fiche, $ids);
        foreach (Controle::where('action_id', $ids['action'])->get() as $controle) {
            $this->controle($controle, 'CONFORME')->assertOk();
        }
        $this->completerCloture($fiche);

        // Résultats mesurés aujourd'hui : rien n'est encore disponible.
        $this->section($fiche, 8, ['mesures' => [], 'maintien' => [['jalon' => 'J30', 'valeur' => 75]]])->assertUnprocessable();
        $this->transition($fiche, 'PILOTE', 'T8')->assertUnprocessable()
            ->assertJsonFragment(['Maintien du résultat : mesure J+30 du KPI principal à venir (le '.today()->addDays(30)->format('d/m/Y').'). La clôture attendra cette mesure.']);

        // Cible de 80 (en baisse) dépassée à J+90 : le résultat n'a pas tenu.
        $fiche->forceFill(['date_resultats' => today()->subDays(95)])->save();
        $this->section($fiche, 8, ['mesures' => [], 'maintien' => [
            ['jalon' => 'J30', 'valeur' => 76], ['jalon' => 'J60', 'valeur' => 78], ['jalon' => 'J90', 'valeur' => 86, 'commentaire' => 'Purgeurs à nouveau fuyards'],
        ]])->assertOk()->assertJsonPath('data.maintien.2.tenu', false);
        $message = collect($this->transition($fiche, 'PILOTE', 'T8')->assertUnprocessable()->json('manques'))->implode(' ');
        $this->assertStringContainsString('Lancez une nouvelle boucle', $message);

        // La mesure Après et l'objectif ne bougent plus pendant le maintien.
        $this->section($fiche, 8, ['mesures' => [['indicateur_id' => $ids['indicateur'], 'valeur' => 99]], 'objectif_atteint' => 'NON'])->assertOk()
            ->assertJsonPath('data.indicateurs.0.apres', 75)
            ->assertJsonPath('data.resultats.objectif_atteint', 'OUI');

        $this->mesurerMaintien($fiche, 74);
        $this->transition($fiche, 'PILOTE', 'T8')->assertOk()->assertJsonPath('data.statut_etape', 'EN_VALIDATION_CLOTURE');
    }

    // ---- Validation finale par le sponsor --------------------------------------------

    public function test_sponsor_holding_the_direction_role_signs_the_closure(): void
    {
        $sponsor = $this->acteur('DIRECTION', $this->unite->id);
        $fiche = $this->declarer();
        $fiche->forceFill(['sponsor_id' => $sponsor[0]->id])->save();
        $ids = $this->amenerEnRealisation($fiche);
        $this->amenerEnVerification($fiche, $ids);
        $this->amenerEnValidationCloture($fiche, $ids['action']);

        $direction = Validation::where('fiche_id', $fiche->id)->where('porte', 2)->where('role_id', $this->roleId('DIRECTION'))->latest('id')->firstOrFail();
        $this->assertSame($sponsor[0]->id, $direction->valideur_id);
    }

    // ---- Classement sans suite -------------------------------------------------------

    public function test_direction_or_functional_admin_files_a_fiche_without_follow_up(): void
    {
        $fiche = $this->declarer();
        $this->designerPilote($fiche);

        $this->transition($fiche, 'PILOTE', 'T14', 'Doublon')->assertForbidden();
        $this->transition($fiche, 'DIRECTION', 'T14')->assertUnprocessable();
        $this->transition($fiche, 'DIRECTION', 'T14', 'Doublon de la fiche sur la pompe P-201')->assertOk()
            ->assertJsonPath('data.statut_etape', 'CLASSE_SANS_SUITE')
            ->assertJsonPath('data.statut_general', 'CLASSE')
            ->assertJsonPath('data.motif_classement', 'Doublon de la fiche sur la pompe P-201');

        $this->transition($fiche, 'PILOTE', 'T2')->assertConflict();
        [$autrePilote] = $this->acteur('PILOTE', $this->unite->id);
        $this->agir('ADMIN_FONCTIONNEL')->patchJson("/api/admin/fiches/{$fiche->id}", ['pilote_id' => $autrePilote->id, 'motif' => 'Mutation'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['pilote_id' => 'Le pilote d’une fiche clôturée ou classée ne change plus.']);
    }

    public function test_a_fiche_in_realisation_cannot_be_filed_without_follow_up(): void
    {
        $fiche = $this->declarer();
        $this->amenerEnRealisation($fiche);

        $this->transition($fiche, 'ADMIN_FONCTIONNEL', 'T14', 'Plus d’actualité')->assertConflict();
    }
}
