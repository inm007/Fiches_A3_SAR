<?php

namespace Tests\Feature;

use App\Models\ActionA3;
use App\Models\Affectation;
use App\Models\Controle;
use App\Models\Equipement;
use App\Models\EvenementHistorique;
use App\Models\FicheA3;
use App\Models\NotificationInterne;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\SimuleFiches;
use Tests\TestCase;

/**
 * Situations de terrain d'une fiche qui vit plusieurs mois : changement de pilote,
 * report d'échéance, action oubliée, valideur absent, rappels, consolidation annuelle.
 */
class SuiviTerrainTest extends TestCase
{
    use DatabaseTransactions;
    use SimuleFiches;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpSimulation();
    }

    public function test_pilot_changes_at_any_step_before_closure_with_a_reason(): void
    {
        $fiche = $this->declarer();
        $this->amenerEnRealisation($fiche);
        [$ancien] = $this->acteurs['PILOTE'];
        $nouveau = $this->acteur('PILOTE', $this->unite->id);
        $url = "/api/admin/fiches/{$fiche->id}";

        $this->agir('ADMIN_FONCTIONNEL')->patchJson($url, ['pilote_id' => $nouveau[0]->id])
            ->assertUnprocessable()->assertJsonValidationErrors('motif');
        $this->agir('ADMIN_FONCTIONNEL')->patchJson($url, ['pilote_id' => null, 'motif' => 'Départ'])
            ->assertUnprocessable()->assertJsonValidationErrors('pilote_id');

        $this->agir('ADMIN_FONCTIONNEL')->patchJson($url, ['pilote_id' => $nouveau[0]->id, 'motif' => 'Mutation du pilote'])
            ->assertOk()->assertJsonPath('data.pilote.id', $nouveau[0]->id);

        $this->assertTrue(EvenementHistorique::where('fiche_id', $fiche->id)->where('type', 'DESIGNATION_PILOTE')->where('commentaire', 'Mutation du pilote')->exists());
        $this->assertTrue(NotificationInterne::where('user_id', $nouveau[0]->id)->where('fiche_id', $fiche->id)->where('type', 'DESIGNATION_PILOTE')->exists());
        $this->assertTrue(NotificationInterne::where('user_id', $ancien->id)->where('fiche_id', $fiche->id)->where('message', 'like', '%n’êtes plus pilote%')->exists());

        $action = $fiche->actions()->firstOrFail();
        $this->agirComme($nouveau)->patchJson("/api/actions/{$action->id}", ['echeance' => today()->addMonths(2)->toDateString(), 'motif' => 'Reprise du dossier'])->assertOk();
        $this->agir('PILOTE')->patchJson("/api/actions/{$action->id}", ['echeance' => today()->addMonths(3)->toDateString(), 'motif' => 'Essai'])->assertForbidden();

        $fiche->update(['statut_etape' => 'CLOTURE', 'statut_general' => 'CLOTURE']);
        $this->agir('ADMIN_FONCTIONNEL')->patchJson($url, ['pilote_id' => $ancien->id, 'motif' => 'Retour'])
            ->assertUnprocessable()->assertJsonValidationErrors('pilote_id');
    }

    public function test_new_pilot_never_keeps_a_pending_validation_of_the_fiche(): void
    {
        $fiche = $this->ficheEnValidationPlan();
        $production = $this->demande($fiche, 'VALIDEUR_PRODUCTION');
        [$valideurProduction] = $this->acteurs['VALIDEUR_PRODUCTION'];
        $cumul = $this->acteur('PILOTE', $this->unite->id);
        Affectation::create(['user_id' => $cumul[0]->id, 'role_id' => $this->roleId('VALIDEUR_PRODUCTION'), 'unite_id' => $this->unite->id, 'actif' => true]);

        $this->agir('ADMIN_FONCTIONNEL')->postJson("/api/admin/validations/{$production->id}/partages", ['valideur_id' => $cumul[0]->id, 'motif' => 'Congés'])->assertOk();
        $this->agir('ADMIN_FONCTIONNEL')->patchJson("/api/admin/fiches/{$fiche->id}", ['pilote_id' => $cumul[0]->id, 'motif' => 'Nouveau pilote'])->assertOk();

        $production->refresh();
        $this->assertSame($valideurProduction->id, $production->valideur_id);
        $this->assertFalse($production->estValideur($cumul[0]->id), 'Un pilote quitte les demandes partagées de sa fiche (B8).');
    }

    public function test_pilot_reschedules_an_action_or_changes_its_owner_with_a_reason(): void
    {
        $fiche = $this->declarer();
        $ids = $this->amenerEnRealisation($fiche);
        $action = ActionA3::findOrFail($ids['action']);
        [$agent] = $this->acteurs['AGENT'];
        $echeance = today()->addMonths(2)->toDateString();

        $this->agir('PILOTE')->getJson("/api/fiches/{$fiche->id}")->assertOk()
            ->assertJsonPath('data.droits.actions_replanifiables', [$action->id]);
        $this->agir('PILOTE')->patchJson("/api/actions/{$action->id}", ['echeance' => $echeance])
            ->assertUnprocessable()->assertJsonValidationErrors('motif');
        $this->agir('AGENT')->patchJson("/api/actions/{$action->id}", ['echeance' => $echeance, 'motif' => 'Retard fournisseur'])->assertForbidden();

        $this->agir('PILOTE')->patchJson("/api/actions/{$action->id}", ['echeance' => $echeance, 'responsable_id' => $agent->id, 'motif' => 'Retard fournisseur'])
            ->assertOk()
            ->assertJsonPath('data.actions.0.echeance', $echeance)
            ->assertJsonPath('data.actions.0.responsable.id', $agent->id);

        $this->assertTrue(EvenementHistorique::where('fiche_id', $fiche->id)->where('type', 'REPORT_ECHEANCE')->where('commentaire', 'Retard fournisseur')->exists());
        $this->assertTrue(EvenementHistorique::where('fiche_id', $fiche->id)->where('type', 'CHANGEMENT_RESPONSABLE')->exists());
        $this->assertTrue(NotificationInterne::where('user_id', $agent->id)->where('type', 'ACTION_ATTRIBUEE')->where('cible_id', $action->id)->exists());
        $this->assertSame('REALISATION_ACTIONS', $fiche->refresh()->statut_etape);

        $action->update(['statut' => 'ANNULE', 'motif_statut' => 'Inutile']);
        $this->agir('PILOTE')->patchJson("/api/actions/{$action->id}", ['echeance' => today()->addMonths(4)->toDateString(), 'motif' => 'Encore'])->assertConflict();
    }

    public function test_pilot_adds_a_forgotten_action_during_realisation_only(): void
    {
        $fiche = $this->declarer();
        $this->designerPilote($fiche);
        $this->transition($fiche, 'PILOTE', 'T2')->assertOk();
        $ids = $this->completerPlan($fiche);
        [$agent] = $this->acteurs['AGENT'];
        $nouvelle = [
            'cause_id' => $ids['cause'],
            'description' => 'Former les opérateurs au contrôle des purgeurs',
            'type_action' => 'PREVENTIVE',
            'responsable_id' => $agent->id,
            'echeance' => today()->addMonth()->toDateString(),
            'motif' => 'Oubli constaté en réunion',
        ];

        $this->agir('PILOTE')->postJson("/api/fiches/{$fiche->id}/actions", $nouvelle)->assertConflict();

        $this->transition($fiche, 'PILOTE', 'T3')->assertOk();
        $this->approuverPorte($fiche, 1);
        $this->assertTrue(NotificationInterne::where('type', 'ACTION_ATTRIBUEE')->where('cible_id', $ids['action'])->exists(), 'T4 prévient le responsable de chaque action du plan.');

        $this->agir('PILOTE')->postJson("/api/fiches/{$fiche->id}/actions", [...$nouvelle, 'motif' => ''])->assertUnprocessable();
        $this->agir('PILOTE')->postJson("/api/fiches/{$fiche->id}/actions", [...$nouvelle, 'cause_id' => 999_999])->assertUnprocessable();
        $this->agir('AGENT')->postJson("/api/fiches/{$fiche->id}/actions", $nouvelle)->assertForbidden();

        $reponse = $this->agir('PILOTE')->postJson("/api/fiches/{$fiche->id}/actions", $nouvelle)->assertOk();
        $this->assertCount(2, $reponse->json('data.actions'));
        $ajoutee = ActionA3::where('fiche_id', $fiche->id)->where('description', $nouvelle['description'])->firstOrFail();
        $this->assertSame('A_FAIRE', $ajoutee->statut);
        $this->assertTrue(EvenementHistorique::where('fiche_id', $fiche->id)->where('type', 'AJOUT_ACTION')->exists());
        $this->assertTrue(NotificationInterne::where('user_id', $agent->id)->where('type', 'ACTION_ATTRIBUEE')->where('cible_id', $ajoutee->id)->exists());
    }

    public function test_admin_shares_a_validation_whose_validator_is_unavailable(): void
    {
        $fiche = $this->ficheEnValidationPlan();
        $production = $this->demande($fiche, 'VALIDEUR_PRODUCTION');
        [$absent] = $this->acteurs['VALIDEUR_PRODUCTION'];
        $remplacant = $this->acteur('VALIDEUR_PRODUCTION', null);
        [$agent] = $this->acteurs['AGENT'];
        $url = "/api/admin/validations/{$production->id}/partages";

        $absent->update(['actif' => false]);

        $this->agir('ADMIN_FONCTIONNEL')->getJson("/api/admin/fiches/{$fiche->id}/validations")->assertOk()
            ->assertJsonPath('data.0.id', $production->id)
            ->assertJsonPath('data.0.valideur_indisponible', true)
            ->assertJsonPath('data.0.candidats.0.id', $remplacant[0]->id);
        $aTraiter = collect($this->agir('ADMIN_FONCTIONNEL')->getJson('/api/tableau-de-bord')->assertOk()->json('data.a_traiter'));
        $this->assertTrue($aTraiter->contains(fn ($item) => $item['type'] === 'reattribution' && $item['fiche_id'] === $fiche->id));

        $this->agir('PILOTE')->postJson($url, ['valideur_id' => $remplacant[0]->id, 'motif' => 'Absence'])->assertForbidden();
        $this->agir('ADMIN_FONCTIONNEL')->postJson($url, ['valideur_id' => $remplacant[0]->id])->assertUnprocessable()->assertJsonValidationErrors('motif');
        $this->agir('ADMIN_FONCTIONNEL')->postJson($url, ['valideur_id' => $agent->id, 'motif' => 'Absence'])->assertUnprocessable();

        $this->agir('ADMIN_FONCTIONNEL')->postJson($url, ['valideur_id' => $remplacant[0]->id, 'motif' => 'Départ du titulaire'])
            ->assertOk()
            ->assertJsonPath('data.valideur.id', $absent->id)
            ->assertJsonPath('data.partages.0.id', $remplacant[0]->id)
            ->assertJsonPath('data.valideur_indisponible', false);

        $this->assertTrue(NotificationInterne::where('user_id', $remplacant[0]->id)->where('type', 'DEMANDE_VALIDATION')->where('cible_id', $production->id)->exists());
        $this->assertTrue(EvenementHistorique::where('fiche_id', $fiche->id)->where('type', 'PARTAGE_VALIDATION')->exists());
        $this->agirComme($remplacant)->getJson('/api/validations')->assertOk()->assertJsonPath('data.0.id', $production->id);
        $this->agirComme($remplacant)->postJson("/api/validations/{$production->id}/decision", ['decision' => 'VALIDE'])->assertOk();

        $production->refresh();
        $this->assertSame($remplacant[0]->id, $production->valideur_id, 'Celui qui décide signe la demande.');
        $this->assertTrue($production->estValideur($absent->id), 'Le valideur d’origine reste associé à la demande.');
    }

    public function test_shared_validation_stays_with_the_original_validator_who_can_still_decide(): void
    {
        $fiche = $this->ficheEnValidationPlan();
        $production = $this->demande($fiche, 'VALIDEUR_PRODUCTION');
        $titulaire = $this->acteurs['VALIDEUR_PRODUCTION'];
        $renfort = $this->acteur('VALIDEUR_PRODUCTION', null);

        $this->agir('ADMIN_FONCTIONNEL')->postJson("/api/admin/validations/{$production->id}/partages", ['valideur_id' => $renfort[0]->id, 'motif' => 'Arrêt maladie'])->assertOk();

        $this->agirComme($titulaire)->getJson("/api/fiches/{$fiche->id}")->assertOk()
            ->assertJsonPath('data.validations.0.partages.0.id', $renfort[0]->id);
        $this->agirComme($renfort)->getJson("/api/fiches/{$fiche->id}")->assertOk();
        $this->agirComme($titulaire)->postJson("/api/validations/{$production->id}/decision", ['decision' => 'VALIDE'])->assertOk();
        $this->agirComme($renfort)->postJson("/api/validations/{$production->id}/decision", ['decision' => 'VALIDE'])->assertConflict();

        $this->agir('ADMIN_FONCTIONNEL')->deleteJson("/api/admin/validations/{$production->id}/partages/{$renfort[0]->id}")->assertOk()
            ->assertJsonPath('data.partages', []);
    }

    public function test_admin_shares_a_fiche_and_both_pilots_continue_it(): void
    {
        $fiche = $this->declarer();
        $ids = $this->amenerEnRealisation($fiche);
        $titulaire = $this->acteurs['PILOTE'];
        $renfort = $this->acteur('PILOTE', $this->unite->id);
        $url = "/api/admin/fiches/{$fiche->id}/copilotes";
        $action = ActionA3::findOrFail($ids['action']);

        $this->agirComme($renfort)->getJson("/api/fiches/{$fiche->id}")->assertNotFound();
        $this->agir('PILOTE')->postJson($url, ['user_id' => $renfort[0]->id, 'motif' => 'Congé'])->assertForbidden();
        $this->agir('ADMIN_FONCTIONNEL')->postJson($url, ['user_id' => $renfort[0]->id])->assertUnprocessable()->assertJsonValidationErrors('motif');
        $this->agir('ADMIN_FONCTIONNEL')->postJson($url, ['user_id' => $titulaire[0]->id, 'motif' => 'Congé'])->assertUnprocessable();

        $this->agir('ADMIN_FONCTIONNEL')->postJson($url, ['user_id' => $renfort[0]->id, 'motif' => 'Arrêt maladie du pilote'])
            ->assertOk()
            ->assertJsonPath('data.pilote.id', $titulaire[0]->id)
            ->assertJsonPath('data.copilotes.0.id', $renfort[0]->id);
        $this->assertTrue(EvenementHistorique::where('fiche_id', $fiche->id)->where('type', 'PARTAGE_FICHE')->where('commentaire', 'Arrêt maladie du pilote')->exists());
        $this->assertTrue(NotificationInterne::where('user_id', $renfort[0]->id)->where('type', 'PARTAGE_FICHE')->exists());
        $this->assertTrue(NotificationInterne::where('user_id', $titulaire[0]->id)->where('type', 'PARTAGE_FICHE')->exists());

        // Le pilote associé poursuit la fiche, le titulaire voit ce qu'il a fait à son retour.
        $this->agirComme($renfort)->getJson("/api/fiches/{$fiche->id}")->assertOk()
            ->assertJsonPath('data.droits.est_pilote', true)
            ->assertJsonPath('data.copilotes.0.id', $renfort[0]->id);
        $this->agirComme($renfort)->patchJson("/api/actions/{$action->id}", ['echeance' => today()->addMonths(2)->toDateString(), 'motif' => 'Pièce en commande'])->assertOk();
        $retour = $this->agirComme($titulaire)->getJson("/api/fiches/{$fiche->id}")->assertOk();
        $this->assertSame(today()->addMonths(2)->toDateString(), $retour->json('data.actions.0.echeance'));
        $this->agirComme($titulaire)->patchJson("/api/actions/{$action->id}", ['echeance' => today()->addMonths(3)->toDateString(), 'motif' => 'Retour de congé'])->assertOk();
        $this->assertGreaterThanOrEqual(1, $this->agirComme($renfort)->getJson('/api/tableau-de-bord')->json('data.mes_fiches'));
        $this->assertTrue(EvenementHistorique::where('fiche_id', $fiche->id)->where('type', 'REPORT_ECHEANCE')->where('user_id', $renfort[0]->id)->exists());

        $this->agir('ADMIN_FONCTIONNEL')->deleteJson("{$url}/{$renfort[0]->id}")->assertOk()->assertJsonPath('data.copilotes', []);
        $this->agirComme($renfort)->getJson("/api/fiches/{$fiche->id}")->assertNotFound();
    }

    public function test_sections_explain_why_they_are_locked(): void
    {
        $fiche = $this->declarer();
        $this->amenerEnRealisation($fiche);

        $pilote = $this->agir('PILOTE')->getJson("/api/fiches/{$fiche->id}")->assertOk()->json('data.droits.sections_etat');
        $pilote = collect($pilote)->keyBy('numero');
        $this->assertSame('fige', $pilote[1]['etat']);
        $this->assertSame('editable', $pilote[7]['etat']);
        $this->assertSame('a_venir', $pilote[8]['etat']);
        $this->assertStringContainsString('Mesure des résultats', $pilote[8]['raison']);
        $this->assertSame('auto', $pilote[12]['etat']);

        $this->assertSame('lecture', $this->agir('DIRECTION')->getJson("/api/fiches/{$fiche->id}")->json('data.droits.sections_etat.0.etat'));

        $this->transition($fiche, 'PILOTE', 'T12', 'Pompe indisponible')->assertOk();
        $this->assertSame('fige', $this->agir('PILOTE')->getJson("/api/fiches/{$fiche->id}")->json('data.droits.sections_etat.6.etat'));
    }

    public function test_daily_reminders_announce_close_deadlines_and_available_controls_once(): void
    {
        ActionA3::query()->update(['statut' => 'REALISE']);
        Controle::query()->whereNull('resultat')->update(['resultat' => 'CONFORME']);
        $fiche = $this->declarer();
        $ids = $this->amenerEnRealisation($fiche);
        $action = ActionA3::findOrFail($ids['action']);
        [$agent] = $this->acteurs['AGENT'];
        [$pilote] = $this->acteurs['PILOTE'];
        $action->update(['responsable_id' => $agent->id, 'echeance' => today()->addDays(2)]);

        $this->artisan('a3:relances')->assertSuccessful();
        $this->artisan('a3:relances')->assertSuccessful();
        $this->assertSame(1, NotificationInterne::where('user_id', $agent->id)->where('type', 'ECHEANCE_PROCHE')->where('cible_id', $action->id)->count());

        $action->update(['echeance' => today()->addDay()]);
        $this->artisan('a3:relances')->assertSuccessful();
        $this->assertSame(2, NotificationInterne::where('user_id', $agent->id)->where('type', 'ECHEANCE_PROCHE')->where('cible_id', $action->id)->count(), 'Une nouvelle échéance donne un nouveau rappel.');

        $this->fermerMoc($fiche, $ids['risque']);
        $this->statutAction($action, 'REALISE', ['date_realisation' => today()->subDays(31)->toDateString()])->assertOk();
        $this->artisan('a3:relances')->assertSuccessful();
        $this->artisan('a3:relances')->assertSuccessful();
        $j30 = Controle::where('action_id', $action->id)->where('jalon', 'J30')->firstOrFail();
        $this->assertSame(1, NotificationInterne::where('user_id', $pilote->id)->where('type', 'CONTROLE_DISPONIBLE')->count());
        $this->assertTrue(NotificationInterne::where('type', 'CONTROLE_DISPONIBLE')->where('cible_type', 'controle')->where('cible_id', $j30->id)->exists());
    }

    public function test_dashboard_consolidates_a_chosen_year_and_reports_efficiency_and_breakdowns(): void
    {
        $fiche = $this->declarer();
        $ids = $this->amenerEnRealisation($fiche);

        $courante = $this->agir('DIRECTION')->getJson('/api/tableau-de-bord')->assertOk();
        $this->assertSame((int) now()->year, $courante->json('data.annee'));
        $this->assertContains((int) now()->year, $courante->json('data.annees_disponibles'));
        $this->assertContains((int) now()->year - 1, $courante->json('data.annees_disponibles'));
        $unites = collect($courante->json('data.repartition.unite'));
        $this->assertSame(1, $unites->firstWhere('libelle', 'Unité de test')['total']);
        $this->assertNotEmpty($courante->json('data.repartition.origine'));
        $this->assertNotEmpty($courante->json('data.repartition.type_amelioration'));

        $this->agir('DIRECTION')->getJson('/api/tableau-de-bord?annee='.(now()->year + 1))->assertUnprocessable();
        $passee = $this->agir('DIRECTION')->getJson('/api/tableau-de-bord?annee='.(now()->year - 1))->assertOk();
        $this->assertSame(now()->year - 1, $passee->json('data.annee'));

        // Vue du seul pilote de l'unité de test : une fiche mesurée sans contrôle renseigné, puis renseigné.
        $this->amenerEnVerification($fiche, $ids, 100);
        $this->assertEquals(0, $this->agir('PILOTE')->getJson('/api/tableau-de-bord')->json('data.part_verification_efficacite'));
        foreach (Controle::where('action_id', $ids['action'])->get() as $controle) {
            $this->controle($controle, 'CONFORME')->assertOk();
        }
        $this->assertEquals(100, $this->agir('PILOTE')->getJson('/api/tableau-de-bord')->json('data.part_verification_efficacite'));
    }

    public function test_register_finds_fiches_by_equipment(): void
    {
        $equipement = Equipement::create(['code' => 'P-'.random_int(1000, 9999), 'libelle' => 'Pompe de test', 'unite_id' => $this->unite->id, 'actif' => true]);
        $avec = $this->declarer(['equipement_id' => $equipement->id]);
        $sans = $this->declarer();

        $parFiltre = collect($this->agir('DIRECTION')->getJson("/api/fiches?equipement_id={$equipement->id}")->assertOk()->json('data'));
        $this->assertSame([$avec->id], $parFiltre->pluck('id')->all());
        $this->assertStringContainsString($equipement->code, $parFiltre->first()['equipement']);

        $parRecherche = collect($this->agir('DIRECTION')->getJson('/api/fiches?q='.$equipement->code)->assertOk()->json('data'))->pluck('id');
        $this->assertTrue($parRecherche->contains($avec->id));
        $this->assertFalse($parRecherche->contains($sans->id));
    }

    public function test_new_local_account_receives_its_password_link(): void
    {
        Notification::fake();

        $local = $this->agir('ADMIN_FONCTIONNEL')->postJson('/api/admin/users', [
            'identifiant' => 'nouveau.compte', 'nom' => 'Ndiaye', 'prenom' => 'Awa', 'email' => 'awa.ndiaye@example.test',
        ])->assertCreated()->assertJsonPath('data.lien_envoye', true);
        Notification::assertSentTo(User::findOrFail($local->json('data.id')), ResetPassword::class);

        $this->agir('ADMIN_FONCTIONNEL')->postJson('/api/admin/users', [
            'identifiant' => 'compte.annuaire', 'nom' => 'Sow', 'prenom' => 'Ali', 'email' => 'ali.sow@example.test',
            'auth_source' => 'ldap', 'ldap_dn' => 'uid=ali.sow,ou=people,dc=sar,dc=sn',
        ])->assertCreated()->assertJsonPath('data.lien_envoye', false);
    }

    private function ficheEnValidationPlan(): FicheA3
    {
        $fiche = $this->declarer();
        $this->designerPilote($fiche);
        $this->transition($fiche, 'PILOTE', 'T2')->assertOk();
        $this->completerPlan($fiche);
        $this->transition($fiche, 'PILOTE', 'T3')->assertOk();

        return $fiche->refresh();
    }
}
