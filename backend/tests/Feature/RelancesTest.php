<?php

namespace Tests\Feature;

use App\Models\ActionA3;
use App\Models\EvenementHistorique;
use App\Models\FicheA3;
use App\Models\NotificationInterne;
use App\Models\Parametre;
use App\Models\Relance;
use App\Models\Validation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\Concerns\SimuleFiches;
use Tests\TestCase;

/**
 * Relances manuelles et rappels automatiques (PRD §9, scénario A15).
 */
class RelancesTest extends TestCase
{
    use RefreshDatabase;
    use SimuleFiches;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpSimulation();
        // Les rappels de la base de démonstration ne doivent pas fausser les comptes.
        ActionA3::query()->whereDate('echeance', '<', today())->update(['statut' => 'REALISE']);
        Validation::query()->where('decision', 'EN_ATTENTE')->update(['decision' => 'ANNULE']);
    }

    public function test_manual_reminder_of_a_late_action_notifies_and_is_limited_to_one_per_day(): void
    {
        $action = $this->actionEnRetard();
        [$agent] = $this->acteurs['AGENT'];
        [$pilote] = $this->acteurs['PILOTE'];

        $this->agir('PILOTE')->getJson("/api/fiches/{$action->fiche_id}")->assertOk()
            ->assertJsonPath('data.actions.0.relancable', true);

        $this->relancer('DIRECTION', 'action', $action->id)->assertOk()
            ->assertJsonPath('data.actions.0.relancable', false)
            ->assertJsonPath('data.actions.0.derniere_relance', fn ($date) => $date !== null);

        $this->assertDatabaseHas('relances', ['cible_type' => ActionA3::class, 'cible_id' => $action->id, 'mode' => 'MANUELLE', 'destinataire_id' => $agent->id]);
        $this->assertSame(1, NotificationInterne::where('user_id', $agent->id)->where('type', 'RELANCE')->count());
        $this->assertSame(1, NotificationInterne::where('user_id', $pilote->id)->where('type', 'RELANCE')->count());
        $this->assertTrue(EvenementHistorique::where('fiche_id', $action->fiche_id)->where('type', 'RELANCE')->exists());

        $this->relancer('PILOTE', 'action', $action->id)->assertStatus(429)
            ->assertJsonPath('message', 'Déjà relancé il y a moins de 24 h.');

        $this->travel(25)->hours();
        $this->relancer('PILOTE', 'action', $action->id)->assertOk();
    }

    public function test_only_the_pilot_direction_and_functional_admin_remind_a_late_action(): void
    {
        $action = $this->actionEnRetard();

        $this->relancer('AGENT', 'action', $action->id)->assertForbidden();
        $this->agir('AGENT')->getJson("/api/fiches/{$action->fiche_id}")->assertOk()
            ->assertJsonPath('data.actions.0.relancable', false);
        $this->relancer('ADMIN_FONCTIONNEL', 'action', $action->id)->assertOk();
    }

    public function test_an_action_on_time_or_finished_cannot_be_reminded(): void
    {
        $action = $this->actionEnRetard();
        $action->update(['echeance' => today()]);

        $this->relancer('PILOTE', 'action', $action->id)->assertUnprocessable()
            ->assertJsonFragment(['Seule une action en retard peut être relancée.']);
        $this->relancer('PILOTE', 'action', 999_999)->assertNotFound();
    }

    public function test_a_pending_validation_can_be_reminded_to_its_validator(): void
    {
        $validation = $this->premiereDemande($this->ficheEnValidation());

        $reponse = $this->relancer('DIRECTION', 'validation', $validation->id)->assertOk();
        $this->assertFalse(collect($reponse->json('data.validations'))->firstWhere('id', $validation->id)['relancable']);
        $this->assertSame(1, NotificationInterne::where('user_id', $validation->valideur_id)->where('type', 'RELANCE')->where('cible_id', $validation->id)->count());

        $this->decider($validation, $validation->role->code, 'VALIDE')->assertOk();
        $this->travel(2)->days();
        $this->relancer('DIRECTION', 'validation', $validation->id)->assertUnprocessable();
    }

    public function test_daily_command_reminds_every_interval_without_duplicates(): void
    {
        $action = $this->actionEnRetard();
        [$agent] = $this->acteurs['AGENT'];

        $this->artisan('a3:relances')->assertSuccessful();
        $this->artisan('a3:relances')->assertSuccessful();
        $this->assertSame(1, Relance::where('cible_id', $action->id)->where('cible_type', ActionA3::class)->count());
        $this->assertDatabaseHas('relances', ['cible_id' => $action->id, 'mode' => 'AUTOMATIQUE', 'auteur_id' => null, 'destinataire_id' => $agent->id]);

        $this->travel(6)->days();
        $this->artisan('a3:relances')->assertSuccessful();
        $this->assertSame(1, Relance::where('cible_id', $action->id)->where('cible_type', ActionA3::class)->count());

        $this->travel(1)->days();
        $this->artisan('a3:relances')->assertSuccessful();
        $this->assertSame(2, Relance::where('cible_id', $action->id)->where('cible_type', ActionA3::class)->count());
    }

    public function test_daily_command_stops_when_resolved_or_access_is_lost(): void
    {
        $action = $this->actionEnRetard();
        $action->update(['statut' => 'REALISE', 'date_realisation' => today()]);
        $this->artisan('a3:relances')->assertSuccessful();
        $this->assertSame(0, Relance::where('cible_type', ActionA3::class)->where('cible_id', $action->id)->count());

        $action->update(['statut' => 'A_FAIRE', 'date_realisation' => null]);
        [$agent] = $this->acteurs['AGENT'];
        $agent->update(['actif' => false]);
        $this->artisan('a3:relances')->assertSuccessful();
        $this->assertSame(0, Relance::where('cible_type', ActionA3::class)->where('cible_id', $action->id)->count());
    }

    public function test_daily_command_reminds_old_validations_unless_disabled(): void
    {
        $validation = $this->premiereDemande($this->ficheEnValidation());

        $this->artisan('a3:relances')->assertSuccessful();
        $this->assertSame(0, Relance::where('cible_type', Validation::class)->count());

        Parametre::updateOrCreate(['cle' => 'reminder_interval_days'], ['valeur' => '3']);
        Parametre::updateOrCreate(['cle' => 'validation_reminders_enabled'], ['valeur' => '0']);
        $this->travel(3)->days();
        $this->artisan('a3:relances')->assertSuccessful();
        $this->assertSame(0, Relance::where('cible_type', Validation::class)->count());

        Parametre::updateOrCreate(['cle' => 'validation_reminders_enabled'], ['valeur' => '1']);
        $this->artisan('a3:relances')->assertSuccessful();
        $this->assertDatabaseHas('relances', ['cible_type' => Validation::class, 'cible_id' => $validation->id, 'mode' => 'AUTOMATIQUE']);
        // Les directeurs sont sollicités en même temps : chaque demande en attente est relancée une fois.
        $this->assertSame(Validation::where('fiche_id', $validation->fiche_id)->where('decision', 'EN_ATTENTE')->count(), Relance::where('cible_type', Validation::class)->count());
    }

    private function premiereDemande(FicheA3 $fiche): Validation
    {
        return Validation::with('role')->where('fiche_id', $fiche->id)->where('decision', 'EN_ATTENTE')->orderBy('ordre')->orderBy('id')->firstOrFail();
    }

    private function relancer(string $role, string $type, int $id): TestResponse
    {
        return $this->agir($role)->postJson('/api/relances', ['cible_type' => $type, 'cible_id' => $id]);
    }

    private function actionEnRetard(): ActionA3
    {
        $ids = $this->amenerEnRealisation();
        [$agent] = $this->acteurs['AGENT'];
        $action = ActionA3::findOrFail($ids['action']);
        $action->update(['responsable_id' => $agent->id, 'echeance' => today()->subDays(2)]);

        return $action;
    }

    private function ficheEnValidation(): FicheA3
    {
        $fiche = $this->declarer();
        $this->lancer($fiche);
        $this->completerPlan($fiche);
        $this->transition($fiche, 'PILOTE', 'T3')->assertOk();

        return $fiche->refresh();
    }
}
