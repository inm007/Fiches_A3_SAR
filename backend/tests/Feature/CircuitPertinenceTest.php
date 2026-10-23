<?php

namespace Tests\Feature;

use App\Models\Affectation;
use App\Models\Entite;
use App\Models\FicheA3;
use App\Models\NotificationInterne;
use App\Models\User;
use App\Models\Validation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\SimuleFiches;
use Tests\TestCase;

/**
 * Circuit précisé le 23 octobre 2026 : l'administrateur désigne le pilote, le pilote remplit
 * les sections 1 à 4 et choisit le chef qui valide la pertinence (porte 0), puis constitue
 * une équipe d'agents et de pilotes. Organigramme : il propose le chef par défaut.
 */
class CircuitPertinenceTest extends TestCase
{
    use RefreshDatabase;
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

    public function test_admin_is_notified_and_the_pilot_fills_sections_one_to_four(): void
    {
        $fiche = $this->declarer();
        $admin = $this->acteurs['ADMIN_FONCTIONNEL'][0];
        $this->assertTrue(NotificationInterne::where('user_id', $admin->id)->where('fiche_id', $fiche->id)->where('type', 'PILOTE_A_DESIGNER')->exists());

        // Le déclarant ne remplit pas la fiche : il attend le pilote désigné par l'administrateur.
        $this->agir('AGENT')->putJson("/api/fiches/{$fiche->id}/sections/2", ['contexte' => 'x', 'enonce_probleme' => 'x'])->assertForbidden();
        $this->designerPilote($fiche);

        $this->transition($fiche, 'PILOTE', 'T0')->assertUnprocessable()
            ->assertJsonFragment(['Section 1 : choisir le directeur sponsor, qui approuvera la clôture.'])
            ->assertJsonFragment(['Section 4 : choisir le chef de département qui valide la pertinence.']);

        // Le chef proposé est celui du département du pilote ; la liste des sponsors ne compte que des directeurs.
        $this->acteurs['PILOTE'][0]->update(['entite_id' => $this->service->id]);
        $options = $this->agir('PILOTE')->getJson("/api/fiches/{$fiche->id}/options")->assertOk();
        $options->assertJsonPath('data.chef_propose', $this->chef[0]->id);
        $this->assertContains($this->acteurs['DIRECTION'][0]->id, collect($options->json('data.sponsors'))->pluck('id'));
        $this->assertNotContains($this->acteurs['AGENT'][0]->id, collect($options->json('data.sponsors'))->pluck('id'));

        $this->section($fiche, 1, ['titre' => 'T', 'unite_id' => $this->unite->id, 'origine_id' => $this->valeur('origine', 'AUDIT'), 'sponsor_id' => $this->acteurs['AGENT'][0]->id])
            ->assertUnprocessable()
            ->assertJsonFragment(['Le sponsor est un directeur actif, qui ne pilote pas la fiche et ne fait pas partie de son équipe.']);
        $this->section($fiche, 4, ['objectif_smart' => 'x', 'chef_pertinence_id' => $this->acteurs['PILOTE'][0]->id])
            ->assertUnprocessable()
            ->assertJsonFragment(['Choisissez un chef de département actif, qui ne pilote pas la fiche et ne fait pas partie de son équipe.']);
    }

    public function test_chosen_head_validates_sends_back_or_files_the_fiche(): void
    {
        $fiche = $this->ficheSoumise();
        $this->assertSame($this->chef[0]->id, $fiche->refresh()->chef_pertinence_id);
        $this->section($fiche, 2, ['contexte' => 'Modifié', 'enonce_probleme' => 'Consommation élevée'])->assertForbidden();

        $demande = Validation::where('fiche_id', $fiche->id)->where('porte', 0)->firstOrFail();
        $this->assertSame($this->chef[0]->id, $demande->valideur_id);
        $this->assertTrue(NotificationInterne::where('user_id', $this->chef[0]->id)->where('type', 'DEMANDE_VALIDATION')->exists());
        $this->agirComme($this->chef)->getJson('/api/validations')->assertOk()->assertJsonPath('data.0.id', $demande->id);

        // « À refaire » : retour au pilote, qui corrige et resoumet.
        $this->agirComme($this->chef)->postJson("/api/validations/{$demande->id}/decision", ['decision' => 'REFUSE'])->assertUnprocessable();
        $this->agirComme($this->chef)->postJson("/api/validations/{$demande->id}/decision", ['decision' => 'REFUSE', 'commentaire' => 'Chiffrer le gain attendu'])->assertOk();
        $this->assertSame('OUVERT', $fiche->refresh()->statut_etape);
        $this->assertTrue(NotificationInterne::where('user_id', $this->acteurs['PILOTE'][0]->id)->where('type', 'REFUS')->exists());
        $this->section($fiche, 2, ['contexte' => 'Gain attendu : 10 t/h', 'enonce_probleme' => 'Consommation élevée'])->assertOk();
        $this->transition($fiche, 'PILOTE', 'T0')->assertOk();

        // Oui : la fiche passe en cours et les sections 2 à 4 sont figées.
        $this->deciderPertinence($fiche);
        $fiche->refresh();
        $this->assertNotNull($fiche->pertinence_validee_le);
        $this->assertSame('EN_COURS', $fiche->statut_etape);
        $this->section($fiche, 4, ['objectif_smart' => 'Autre objectif'])->assertForbidden();

        // Non : le chef classe la fiche sans suite.
        $autre = $this->ficheSoumise();
        $demande = Validation::where('fiche_id', $autre->id)->where('porte', 0)->where('decision', 'EN_ATTENTE')->firstOrFail();
        $this->agirComme($this->chef)->postJson("/api/validations/{$demande->id}/decision", ['decision' => 'REFUSE', 'commentaire' => 'Déjà traité par le projet vapeur', 'classer' => true])->assertOk();
        $autre->refresh();
        $this->assertSame('CLASSE_SANS_SUITE', $autre->statut_etape);
        $this->assertSame('Déjà traité par le projet vapeur', $autre->motif_classement);
    }

    public function test_submission_explains_an_unavailable_head(): void
    {
        $fiche = $this->declarer();
        $this->designerPilote($fiche);
        $this->remplirPertinence($fiche);

        $this->agir('ADMIN_FONCTIONNEL')->patchJson("/api/admin/entities/{$this->departement->id}", ['responsable_id' => null])->assertOk();
        $this->assertFalse($this->chef[1]->refresh()->actif);
        $this->transition($fiche, 'PILOTE', 'T0')->assertUnprocessable()
            ->assertJsonFragment(['Section 4 : le chef de département choisi n’est plus disponible (profil retiré, compte désactivé ou membre de la fiche) : choisissez-en un autre.']);
        $this->assertSame('OUVERT', $fiche->refresh()->statut_etape);
    }

    public function test_pilot_builds_a_team_of_agents_and_pilots_after_the_relevance(): void
    {
        $membre = $this->acteur('AGENT', null);
        $controle = $this->acteur('CONTROLE_GESTION', null);
        $fiche = $this->ficheSoumise();

        $this->agir('PILOTE')->postJson("/api/fiches/{$fiche->id}/membres", ['user_id' => $membre[0]->id])->assertConflict();
        $this->deciderPertinence($fiche);

        $this->agirComme($membre)->getJson("/api/fiches/{$fiche->id}")->assertNotFound();
        $this->assertNotContains($controle[0]->id, collect($this->agir('PILOTE')->getJson("/api/fiches/{$fiche->id}/options")->json('data.membres_possibles'))->pluck('id'));
        $this->agir('AGENT')->postJson("/api/fiches/{$fiche->id}/membres", ['user_id' => $membre[0]->id])->assertForbidden();
        $this->agir('PILOTE')->postJson("/api/fiches/{$fiche->id}/membres", ['user_id' => $controle[0]->id])
            ->assertUnprocessable()->assertJsonFragment(['L’équipe se compose d’agents et de pilotes actifs.']);
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

    public function test_a_team_member_never_validates_the_fiche(): void
    {
        // Un membre qui détient aussi un rôle de directeur n'est pas sollicité aux portes 1 et 2.
        $membre = $this->acteur('PILOTE', $this->unite->id);
        Affectation::create(['user_id' => $membre[0]->id, 'role_id' => $this->roleId('VALIDEUR_HSE'), 'unite_id' => $this->unite->id, 'actif' => true]);
        Affectation::where('user_id', $this->acteurs['VALIDEUR_HSE'][0]->id)->update(['actif' => false]);
        $fiche = $this->ficheSoumise();
        $this->deciderPertinence($fiche);
        $this->agir('PILOTE')->postJson("/api/fiches/{$fiche->id}/membres", ['user_id' => $membre[0]->id])->assertOk();
        $this->completerPlan($fiche);

        $this->transition($fiche, 'PILOTE', 'T3')->assertUnprocessable()
            ->assertJsonFragment(['Aucun titulaire du rôle « Directeur QHSE (DHSE) » n’est affecté à l’unité de la fiche ni au périmètre global.']);
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
        $this->completerDebut($fiche, $this->chef[0]->id);
    }

    private function ficheSoumise(): FicheA3
    {
        $fiche = $this->declarer();
        $this->designerPilote($fiche);
        $this->remplirPertinence($fiche);
        $this->transition($fiche, 'PILOTE', 'T0')->assertOk()->assertJsonPath('data.statut_etape', 'EN_VALIDATION_PERTINENCE');

        return $fiche->refresh();
    }

    private function deciderPertinence(FicheA3 $fiche): void
    {
        $demande = Validation::where('fiche_id', $fiche->id)->where('porte', 0)->where('decision', 'EN_ATTENTE')->firstOrFail();
        $this->agirComme($this->chef)->postJson("/api/validations/{$demande->id}/decision", ['decision' => 'VALIDE'])->assertOk();
    }
}
