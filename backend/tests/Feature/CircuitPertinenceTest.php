<?php

namespace Tests\Feature;

use App\Models\Affectation;
use App\Models\Entite;
use App\Models\FicheA3;
use App\Models\NotificationInterne;
use App\Models\User;
use App\Models\Validation;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\Concerns\SimuleFiches;
use Tests\TestCase;

/**
 * Retours de la réunion du 20 octobre 2026 : validation de la pertinence par le chef de
 * département de l'initiateur (porte 0), envoi au pilote, organigramme et équipe de la fiche.
 */
class CircuitPertinenceTest extends TestCase
{
    use DatabaseTransactions;
    use SimuleFiches;

    private Entite $departement;

    private Entite $service;

    /** @var array{0: User, 1: Affectation} */
    private array $chef;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpSimulation();

        $chef = User::factory()->create(['identifiant' => 'chef.'.Str::random(6), 'actif' => true]);
        $direction = $this->entite('DIRECTION', null);
        $this->departement = $this->entite('DEPARTEMENT', $direction->id, $chef->id);
        $this->service = $this->entite('SERVICE', $this->departement->id);
        $this->acteurs['AGENT'][0]->update(['entite_id' => $this->service->id]);

        $affectation = Affectation::where('user_id', $chef->id)->where('role_id', $this->roleId('CHEF_DEPARTEMENT'))->firstOrFail();
        $this->chef = [$chef, $affectation];
    }

    public function test_initiator_submits_to_department_head_and_the_only_pilot_receives_the_fiche(): void
    {
        [$pilote] = $this->acteurs['PILOTE'];
        $fiche = $this->declarer();

        $this->transition($fiche, 'AGENT', 'T0')->assertUnprocessable()
            ->assertJsonFragment(['Section 2 : contexte.'])
            ->assertJsonFragment(['Section 4 : objectif SMART.']);

        $this->remplirPertinence($fiche);
        $this->transition($fiche, 'AGENT', 'T0')->assertOk()->assertJsonPath('data.statut_etape', 'EN_VALIDATION_PERTINENCE');
        $this->assertSame($this->departement->id, $fiche->refresh()->departement_id);
        $this->agir('AGENT')->putJson("/api/fiches/{$fiche->id}/sections/2", ['contexte' => 'Modifié', 'enonce_probleme' => 'Consommation élevée'])->assertForbidden();

        $demande = Validation::where('fiche_id', $fiche->id)->where('porte', 0)->firstOrFail();
        $this->assertSame($this->chef[0]->id, $demande->valideur_id);
        $this->assertTrue(NotificationInterne::where('user_id', $this->chef[0]->id)->where('type', 'DEMANDE_VALIDATION')->exists());
        $this->agirComme($this->chef)->getJson('/api/validations')->assertOk()->assertJsonPath('data.0.id', $demande->id);

        // Refus : retour à l'initiateur, qui corrige et resoumet.
        $this->agirComme($this->chef)->postJson("/api/validations/{$demande->id}/decision", ['decision' => 'REFUSE'])->assertUnprocessable();
        $this->agirComme($this->chef)->postJson("/api/validations/{$demande->id}/decision", ['decision' => 'REFUSE', 'commentaire' => 'Chiffrer le gain attendu'])->assertOk();
        $this->assertSame('OUVERT', $fiche->refresh()->statut_etape);
        $this->assertTrue(NotificationInterne::where('user_id', $this->acteurs['AGENT'][0]->id)->where('type', 'REFUS')->exists());
        $this->agir('AGENT')->putJson("/api/fiches/{$fiche->id}/sections/2", ['contexte' => 'Gain attendu : 10 t/h', 'enonce_probleme' => 'Consommation élevée'])->assertOk();
        $this->transition($fiche, 'AGENT', 'T0')->assertOk();

        $demande = Validation::where('fiche_id', $fiche->id)->where('porte', 0)->where('decision', 'EN_ATTENTE')->firstOrFail();
        $this->agirComme($this->chef)->postJson("/api/validations/{$demande->id}/decision", ['decision' => 'VALIDE'])->assertOk();

        $fiche->refresh();
        $this->assertNotNull($fiche->pertinence_validee_le);
        $this->assertSame($pilote->id, $fiche->pilote_id);
        $this->assertSame('EN_COURS', $fiche->statut_etape);
        $this->assertTrue(NotificationInterne::where('user_id', $pilote->id)->where('type', 'FICHE_A_PILOTER')->exists());
    }

    public function test_with_several_pilots_the_first_who_takes_the_fiche_pilots_it(): void
    {
        $autrePilote = $this->acteur('PILOTE', $this->unite->id);
        $fiche = $this->ficheSoumise();
        $this->deciderPertinence($fiche);

        $fiche->refresh();
        $this->assertNull($fiche->pilote_id);
        $this->assertSame('OUVERT', $fiche->statut_etape);
        foreach ([$this->acteurs['PILOTE'][0], $autrePilote[0]] as $pilote) {
            $this->assertTrue(NotificationInterne::where('user_id', $pilote->id)->where('fiche_id', $fiche->id)->where('type', 'FICHE_A_PILOTER')->exists());
        }

        $this->agirComme($autrePilote)->getJson("/api/fiches/{$fiche->id}")->assertOk()->assertJsonPath('data.droits.transitions', ['T2']);
        $this->agirComme($autrePilote)->postJson("/api/fiches/{$fiche->id}/transitions", ['code' => 'T2'])->assertOk();
        $this->assertSame($autrePilote[0]->id, $fiche->refresh()->pilote_id);
        $this->transition($fiche, 'PILOTE', 'T2')->assertNotFound();
    }

    public function test_submission_explains_a_missing_department_or_head(): void
    {
        $this->acteurs['AGENT'][0]->update(['entite_id' => null]);
        $fiche = $this->declarer();
        $this->remplirPertinence($fiche);
        $this->transition($fiche, 'AGENT', 'T0')->assertUnprocessable()
            ->assertJsonFragment(['Votre rattachement à un département n’est pas renseigné dans l’organigramme : demandez à l’administrateur fonctionnel.']);

        $this->acteurs['AGENT'][0]->update(['entite_id' => $this->service->id]);
        $this->agir('ADMIN_FONCTIONNEL')->patchJson("/api/admin/entities/{$this->departement->id}", ['responsable_id' => null])->assertOk();
        $this->assertFalse($this->chef[1]->refresh()->actif);
        $this->transition($fiche, 'AGENT', 'T0')->assertUnprocessable()
            ->assertJsonFragment(['Aucun chef actif n’est désigné pour le département « '.$this->departement->libelle.' » : demandez à l’administrateur fonctionnel de compléter l’organigramme.']);
        $this->assertSame('OUVERT', $fiche->refresh()->statut_etape);
    }

    public function test_head_of_department_who_declares_needs_no_validation(): void
    {
        [$pilote] = $this->acteurs['PILOTE'];
        $this->chef[0]->update(['entite_id' => $this->departement->id]);
        $agentChef = Affectation::create(['user_id' => $this->chef[0]->id, 'role_id' => $this->roleId('AGENT'), 'unite_id' => $this->unite->id, 'actif' => true]);
        $this->acteurs['AGENT'] = [$this->chef[0], $agentChef];

        $fiche = $this->declarer();
        $this->remplirPertinence($fiche);
        $this->transition($fiche, 'AGENT', 'T0')->assertOk()->assertJsonPath('data.statut_etape', 'EN_COURS');

        $this->assertFalse(Validation::where('fiche_id', $fiche->id)->exists());
        $this->assertSame($pilote->id, $fiche->refresh()->pilote_id);
    }

    public function test_pilot_builds_a_team_whose_members_fill_the_analysis(): void
    {
        $membre = $this->acteur('CONTROLE_GESTION', null);
        $fiche = $this->ficheSoumise();
        $this->deciderPertinence($fiche);

        $this->agirComme($membre)->getJson("/api/fiches/{$fiche->id}")->assertNotFound();
        $this->agir('AGENT')->postJson("/api/fiches/{$fiche->id}/membres", ['user_id' => $membre[0]->id])->assertForbidden();
        $this->agir('PILOTE')->postJson("/api/fiches/{$fiche->id}/membres", ['user_id' => $this->acteurs['PILOTE'][0]->id])->assertUnprocessable();
        $this->agir('PILOTE')->postJson("/api/fiches/{$fiche->id}/membres", ['user_id' => $membre[0]->id])
            ->assertOk()
            ->assertJsonPath('data.membres.0.id', $membre[0]->id);
        $this->assertTrue(NotificationInterne::where('user_id', $membre[0]->id)->where('type', 'AJOUT_MEMBRE')->exists());

        $this->agirComme($membre)->getJson("/api/fiches/{$fiche->id}")->assertOk()
            ->assertJsonPath('data.droits.est_membre', true)
            ->assertJsonPath('data.droits.sections_editables', [5, 6, 7]);
        $this->agirComme($membre)->putJson("/api/fiches/{$fiche->id}/sections/5", ['methode_analyse' => '5_POURQUOI', 'causes' => [
            ['categorie' => 'METHODE', 'libelle' => 'Purgeurs non inspectés', 'niveau' => 1, 'racine' => true],
        ]])->assertOk();
        $this->agirComme($membre)->putJson("/api/fiches/{$fiche->id}/sections/4", ['objectif_smart' => 'Autre objectif'])->assertForbidden();
        $this->agirComme($membre)->postJson("/api/fiches/{$fiche->id}/transitions", ['code' => 'T3'])->assertForbidden();

        $this->agir('PILOTE')->deleteJson("/api/fiches/{$fiche->id}/membres/{$membre[0]->id}")->assertOk()->assertJsonPath('data.membres', []);
        $this->agirComme($membre)->getJson("/api/fiches/{$fiche->id}")->assertNotFound();
    }

    public function test_organisation_chart_rules(): void
    {
        $this->agir('PILOTE')->getJson('/api/admin/entities')->assertForbidden();
        $this->agir('ADMIN_FONCTIONNEL')->postJson('/api/admin/entities', ['code' => 'D-X', 'libelle' => 'Département orphelin', 'type' => 'DEPARTEMENT'])
            ->assertUnprocessable()->assertJsonValidationErrors('parent_id');
        $this->agir('ADMIN_FONCTIONNEL')->postJson('/api/admin/entities', ['code' => 'S-X', 'libelle' => 'Service', 'type' => 'SERVICE', 'parent_id' => $this->departement->parent_id])
            ->assertUnprocessable()->assertJsonValidationErrors('parent_id');

        // Le profil Chef de département suit le responsable du département.
        $nouveauChef = User::factory()->create(['actif' => true]);
        $this->agir('ADMIN_FONCTIONNEL')->patchJson("/api/admin/entities/{$this->departement->id}", ['responsable_id' => $nouveauChef->id])->assertOk();
        $this->assertFalse($this->chef[1]->refresh()->actif);
        $this->assertTrue(Affectation::where('user_id', $nouveauChef->id)->where('role_id', $this->roleId('CHEF_DEPARTEMENT'))->where('actif', true)->exists());

        $this->agir('ADMIN_FONCTIONNEL')->postJson('/api/admin/assignments', ['user_id' => $nouveauChef->id, 'role_id' => $this->roleId('CHEF_DEPARTEMENT'), 'unite_id' => null])
            ->assertUnprocessable()->assertJsonValidationErrors('role_id');
        $this->agir('ADMIN_FONCTIONNEL')->patchJson("/api/admin/users/{$this->acteurs['PILOTE'][0]->id}", ['entite_id' => $this->service->id])
            ->assertOk()->assertJsonPath('data.entite_id', $this->service->id);
    }

    private function entite(string $type, ?int $parentId, ?int $responsableId = null): Entite
    {
        $id = $this->agir('ADMIN_FONCTIONNEL')->postJson('/api/admin/entities', [
            'code' => $type.'-'.Str::random(6),
            'libelle' => ucfirst(strtolower($type)).' de test',
            'type' => $type,
            'parent_id' => $parentId,
            'responsable_id' => $responsableId,
        ])->assertCreated()->json('data.id');

        return Entite::findOrFail($id);
    }

    private function remplirPertinence(FicheA3 $fiche): void
    {
        $agent = $this->agir('AGENT');
        $agent->putJson("/api/fiches/{$fiche->id}/sections/1", [
            'titre' => 'Réduire la consommation de vapeur',
            'unite_id' => $this->unite->id,
            'origine_id' => $this->valeur('origine', 'AUDIT'),
            'type_amelioration' => 'ENERGIE',
            'date_cible' => today()->addMonths(3)->toDateString(),
        ])->assertOk();
        $agent->putJson("/api/fiches/{$fiche->id}/sections/2", ['contexte' => 'Purgeurs fuyards', 'enonce_probleme' => 'Consommation élevée'])->assertOk();
        $agent->putJson("/api/fiches/{$fiche->id}/sections/3", ['indicateurs' => [
            ['libelle' => 'Consommation vapeur', 'unite_mesure' => 't/h', 'sens' => 'baisse', 'reference' => 100, 'cible' => 80, 'actuelle' => 100, 'role' => 'PRINCIPAL'],
        ]])->assertOk();
        $agent->putJson("/api/fiches/{$fiche->id}/sections/4", ['objectif_smart' => 'Réduire de 20 %', 'resultats_attendus' => 'Sous 80 t/h pendant trois mois'])->assertOk();
    }

    private function ficheSoumise(): FicheA3
    {
        $fiche = $this->declarer();
        $this->remplirPertinence($fiche);
        $this->transition($fiche, 'AGENT', 'T0')->assertOk();

        return $fiche;
    }

    private function deciderPertinence(FicheA3 $fiche): void
    {
        $demande = Validation::where('fiche_id', $fiche->id)->where('porte', 0)->where('decision', 'EN_ATTENTE')->firstOrFail();
        $this->agirComme($this->chef)->postJson("/api/validations/{$demande->id}/decision", ['decision' => 'VALIDE'])->assertOk();
    }
}
