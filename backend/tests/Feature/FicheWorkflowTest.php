<?php

namespace Tests\Feature;

use App\Models\ActionA3;
use App\Models\Affectation;
use App\Models\Cause;
use App\Models\Controle;
use App\Models\EvenementHistorique;
use App\Models\Validation;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Carbon;
use Tests\Concerns\SimuleFiches;
use Tests\TestCase;

class FicheWorkflowTest extends TestCase
{
    use DatabaseTransactions;
    use SimuleFiches;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpSimulation();
    }

    public function test_full_a3_cycle_from_declaration_to_closure(): void
    {
        $fiche = $this->declarer();
        $this->assertMatchesRegularExpression('/^A3-\d{4}-\d{3}$/', $fiche->numero_a3);
        $this->assertSame('OUVERT', $fiche->statut_etape);

        $this->designerPilote($fiche);
        $this->transition($fiche, 'PILOTE', 'T2')->assertOk()->assertJsonPath('data.statut_etape', 'EN_COURS');

        $this->transition($fiche, 'PILOTE', 'T3')
            ->assertUnprocessable()
            ->assertJsonPath('code', 'CONDITIONS_MANQUANTES')
            ->assertJsonFragment(['Section 5 : méthode d’analyse.']);

        $ids = $this->completerPlan($fiche);
        $this->transition($fiche, 'PILOTE', 'T3')->assertOk()->assertJsonPath('data.statut_etape', 'EN_VALIDATION_PLAN');

        $production = $this->demande($fiche, 'VALIDEUR_PRODUCTION');
        $hse = $this->demande($fiche, 'VALIDEUR_HSE');
        $this->assertSame(1, $production->ordre);
        $this->assertSame(2, $hse->ordre);

        // Production / Exploitation passe en premier (PRD §7).
        $this->decider($hse, 'VALIDEUR_HSE', 'VALIDE')->assertConflict();
        $this->decider($production, 'VALIDEUR_PRODUCTION', 'VALIDE')->assertOk();

        // B6 : refus sans commentaire interdit ; T5 ramène la fiche à En cours.
        $this->decider($hse, 'VALIDEUR_HSE', 'REFUSE')->assertUnprocessable();
        $this->decider($hse, 'VALIDEUR_HSE', 'REFUSE', 'Mesure de maîtrise insuffisante.')
            ->assertOk()
            ->assertJsonPath('data.statut_etape', 'EN_COURS');

        // Nouvelle soumission : la signature Production est conservée, seul HSE est redemandé.
        $this->transition($fiche, 'PILOTE', 'T3')->assertOk();
        $this->assertSame(1, Validation::where('fiche_id', $fiche->id)->where('role_id', $this->roleId('VALIDEUR_PRODUCTION'))->count());
        $this->decider($this->demande($fiche, 'VALIDEUR_HSE'), 'VALIDEUR_HSE', 'VALIDE')
            ->assertOk()
            ->assertJsonPath('data.statut_etape', 'REALISATION_ACTIONS');

        // B1 : action sous MOC non clôturé.
        $action = ActionA3::findOrFail($ids['action']);
        $this->statutAction($action, 'EN_COURS')->assertUnprocessable()->assertJsonFragment(['B1 : le MOC doit être clôturé (section 7).']);
        $this->section($fiche, 7, [
            'domaines' => [],
            'risques' => [['id' => $ids['risque'], 'domaine' => 'QHSE', 'description' => 'Fuite vapeur', 'moc_reference' => 'MOC-2026-01', 'moc_statut' => 'CLOTURE', 'moc_preuve' => 'PV de clôture']],
        ])->assertOk();
        $this->statutAction($action, 'EN_COURS')->assertOk();
        $this->statutAction($action, 'REALISE', ['date_realisation' => today()->subDays(100)->toDateString()])->assertOk();
        $this->assertSame(['J30', 'J60', 'J90'], Controle::where('action_id', $action->id)->orderBy('jalon')->pluck('jalon')->all());

        $this->transition($fiche, 'PILOTE', 'T6')->assertOk()->assertJsonPath('data.statut_etape', 'MESURE_RESULTATS');

        // B3 : mesure Après du KPI principal.
        $this->transition($fiche, 'PILOTE', 'T7')->assertUnprocessable();
        $this->section($fiche, 8, [
            'mesures' => [['indicateur_id' => $ids['indicateur'], 'valeur' => 75, 'date_mesure' => today()->toDateString()]],
            'objectif_atteint' => 'OUI',
        ])->assertOk()->assertJsonPath('data.indicateurs.0.amelioration_pourcent', 25);
        $this->transition($fiche, 'PILOTE', 'T7')->assertOk()->assertJsonPath('data.statut_etape', 'VERIFICATION_MAINTIEN');

        // Contrôles : un échec impose une action corrective et sa vérification (B4, D2).
        $controles = Controle::where('action_id', $action->id)->get()->keyBy('jalon');
        $this->controle($controles['J30'], 'CONFORME')->assertOk();
        $this->controle($controles['J60'], 'NON_CONFORME')->assertUnprocessable();
        $this->controle($controles['J60'], 'NON_CONFORME', [
            'description' => 'Remplacer les purgeurs restants',
            'echeance' => today()->addDays(10)->toDateString(),
        ])->assertOk();
        $this->controle($controles['J90'], 'CONFORME')->assertOk();
        $this->completerCloture($fiche);

        $this->transition($fiche, 'PILOTE', 'T8')
            ->assertUnprocessable()
            ->assertJsonFragment(['Action « Remplacer les purgeurs restants » : elle doit être réalisée avant ses contrôles.']);

        $corrective = ActionA3::where('action_origine_id', $action->id)->firstOrFail();
        $this->statutAction($corrective, 'REALISE', ['date_realisation' => today()->subDays(40)->toDateString()])->assertOk();
        $this->controle(Controle::where('action_id', $corrective->id)->where('jalon', 'CORRECTIF')->firstOrFail(), 'CONFORME')->assertOk();

        $this->transition($fiche, 'PILOTE', 'T8')->assertOk()->assertJsonPath('data.statut_etape', 'EN_VALIDATION_CLOTURE');

        // Porte 2 : Contrôle de gestion (gains) puis Direction (B5).
        $controleGestion = $this->demande($fiche, 'CONTROLE_GESTION');
        $direction = $this->demande($fiche, 'DIRECTION');
        $this->decider($direction, 'DIRECTION', 'VALIDE')->assertConflict();
        $this->decider($controleGestion, 'CONTROLE_GESTION', 'VALIDE')->assertUnprocessable();

        $gain = $fiche->gains()->firstOrFail();
        $this->assertSame(10_500_000, $gain->montant_annuel);
        $this->agir('CONTROLE_GESTION')->postJson("/api/gains/{$gain->id}/decision", ['decision' => 'VALIDE'])->assertOk();
        $this->decider($controleGestion, 'CONTROLE_GESTION', 'VALIDE')->assertOk();
        $this->decider($direction, 'DIRECTION', 'VALIDE')
            ->assertOk()
            ->assertJsonPath('data.statut_etape', 'CLOTURE')
            ->assertJsonPath('data.statut_general', 'CLOTURE')
            ->assertJsonPath('data.date_cloture', today()->toDateString())
            ->assertJsonPath('data.gains.gain_net', 7_300_000);

        $this->assertTrue(EvenementHistorique::where('fiche_id', $fiche->id)->where('commentaire', 'like', 'T9%')->whereNull('user_id')->exists());
    }

    public function test_numbering_restarts_each_year(): void
    {
        Carbon::setTestNow('2031-03-01');
        $first = $this->declarer();
        $second = $this->declarer();
        Carbon::setTestNow('2032-01-02');
        $nextYear = $this->declarer();
        Carbon::setTestNow();

        $this->assertSame('A3-2031-001', $first->numero_a3);
        $this->assertSame('A3-2031-002', $second->numero_a3);
        $this->assertSame('A3-2032-001', $nextYear->numero_a3);
    }

    public function test_only_agent_and_pilot_profiles_declare(): void
    {
        $this->agir('DIRECTION')->postJson('/api/fiches', $this->declaration())->assertForbidden();
    }

    public function test_pilot_never_validates_own_fiche(): void
    {
        [$pilote] = $this->acteurs['PILOTE'];
        Affectation::where('role_id', $this->roleId('VALIDEUR_HSE'))->where('unite_id', $this->unite->id)->update(['actif' => false]);
        Affectation::where('role_id', $this->roleId('VALIDEUR_HSE'))->whereNull('unite_id')->update(['actif' => false]);
        Affectation::create(['user_id' => $pilote->id, 'role_id' => $this->roleId('VALIDEUR_HSE'), 'unite_id' => $this->unite->id, 'actif' => true]);

        $fiche = $this->declarer();
        $this->designerPilote($fiche);
        $this->transition($fiche, 'PILOTE', 'T2')->assertOk();
        $this->completerPlan($fiche);

        $this->transition($fiche, 'PILOTE', 'T3')
            ->assertUnprocessable()
            ->assertJsonFragment(['Aucun titulaire du rôle « Valideur HSE » n’est affecté à l’unité de la fiche ni au périmètre global.']);
    }

    public function test_stale_transition_returns_conflict(): void
    {
        $fiche = $this->declarer();
        $this->designerPilote($fiche);

        $this->agir('PILOTE')->postJson("/api/fiches/{$fiche->id}/transitions", ['code' => 'T2', 'etape' => 'EN_COURS'])->assertConflict();
        $this->transition($fiche, 'PILOTE', 'T2')->assertOk();
        $this->transition($fiche, 'PILOTE', 'T2')->assertConflict();
    }

    public function test_hold_requires_reason_and_resumes_previous_step(): void
    {
        $fiche = $this->declarer();
        $this->designerPilote($fiche);
        $this->transition($fiche, 'PILOTE', 'T2')->assertOk();

        $this->transition($fiche, 'DIRECTION', 'T12')->assertUnprocessable();
        $this->transition($fiche, 'DIRECTION', 'T12', 'Arrêt programmé de l’unité')
            ->assertOk()
            ->assertJsonPath('data.statut_etape', 'EN_ATTENTE')
            ->assertJsonPath('data.statut_general', 'EN_ATTENTE');
        $this->transition($fiche, 'PILOTE', 'T13')->assertOk()->assertJsonPath('data.statut_etape', 'EN_COURS');
    }

    public function test_restricted_fiche_is_not_found_for_unauthorised_profiles(): void
    {
        $fiche = $this->declarer(['confidentialite' => 'RESTREINT']);
        $autreAgent = $this->acteur('AGENT', $this->unite->id);

        $this->actingAs($autreAgent[0])->withSession(['auth.active_assignment_id' => $autreAgent[1]->id])
            ->getJson("/api/fiches/{$fiche->id}")->assertNotFound();
        $this->agir('VALIDEUR_HSE')->getJson("/api/fiches/{$fiche->id}")->assertNotFound();
        $technique = $this->acteur('ADMIN_TECHNIQUE', null);
        $this->actingAs($technique[0])->withSession(['auth.active_assignment_id' => $technique[1]->id])
            ->getJson("/api/fiches/{$fiche->id}")->assertNotFound();

        $this->agir('AGENT')->getJson("/api/fiches/{$fiche->id}")->assertOk();
        $this->agir('DIRECTION')->getJson("/api/fiches/{$fiche->id}")->assertOk();
        $this->agir('DIRECTION')->getJson('/api/fiches?q='.$fiche->numero_a3)->assertOk()->assertJsonPath('meta.total', 1);
    }

    public function test_dashboard_counts_only_visible_fiches(): void
    {
        $fiche = $this->declarer();
        $this->declarer(['confidentialite' => 'RESTREINT']);
        $cause = Cause::create([
            'fiche_id' => $fiche->id,
            'numero' => 1,
            'methode' => '5_POURQUOI',
            'categorie' => 'METHODE',
            'libelle' => 'Cause',
        ]);
        ActionA3::create([
            'fiche_id' => $fiche->id,
            'cause_id' => $cause->id,
            'description' => 'Action à faire',
            'type_action' => 'CORRECTIVE',
            'echeance' => today()->addWeek(),
            'statut' => 'A_FAIRE',
        ]);
        ActionA3::create([
            'fiche_id' => $fiche->id,
            'cause_id' => $cause->id,
            'description' => 'Action en cours',
            'type_action' => 'CORRECTIVE',
            'echeance' => today()->addWeek(),
            'statut' => 'EN_COURS',
        ]);
        $moisCourant = now()->format('Y-m');

        $this->agir('AGENT')->getJson('/api/tableau-de-bord')
            ->assertOk()
            ->assertJsonPath('data.mes_fiches', 2)
            ->assertJsonPath('data.par_etape.OUVERT', 2)
            ->assertJsonPath('data.actions_par_statut.A_FAIRE', 1)
            ->assertJsonPath('data.actions_par_statut.EN_COURS', 1)
            ->assertJsonPath('data.fiches_creees_par_mois.5.mois', $moisCourant)
            ->assertJsonPath('data.fiches_creees_par_mois.5.total', 2);

        $autreAgent = $this->acteur('AGENT', $this->unite->id);
        $this->actingAs($autreAgent[0])->withSession(['auth.active_assignment_id' => $autreAgent[1]->id])
            ->getJson('/api/tableau-de-bord')
            ->assertOk()
            ->assertJsonPath('data.fiches_total', 0)
            ->assertJsonPath('data.actions_par_statut.A_FAIRE', 0)
            ->assertJsonPath('data.fiches_creees_par_mois.5.total', 0);

        $this->agir('ADMIN_FONCTIONNEL')->getJson('/api/tableau-de-bord')
            ->assertOk()
            ->assertJsonPath('data.a_traiter.0.libelle', 'Désigner le pilote');
    }

    public function test_sections_are_reserved_to_the_designated_pilot(): void
    {
        $fiche = $this->declarer();
        $this->designerPilote($fiche);
        $this->transition($fiche, 'PILOTE', 'T2')->assertOk();

        $this->agir('DIRECTION')->putJson("/api/fiches/{$fiche->id}/sections/4", ['objectif_smart' => 'x'])->assertForbidden();
        $this->section($fiche, 4, ['objectif_smart' => 'Réduire de 20 % avant fin novembre'])
            ->assertOk()
            ->assertJsonPath('data.objectif.objectif_smart', 'Réduire de 20 % avant fin novembre');
        $this->assertTrue(EvenementHistorique::where('fiche_id', $fiche->id)->where('champ', 'objectif_smart')->exists());
    }
}
