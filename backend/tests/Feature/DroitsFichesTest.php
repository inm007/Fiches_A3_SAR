<?php

namespace Tests\Feature;

use App\Models\ActionA3;
use App\Models\EvenementHistorique;
use App\Models\FicheA3;
use App\Models\NotificationInterne;
use App\Models\Unite;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\Concerns\SimuleFiches;
use Tests\TestCase;

/**
 * Matrice des permissions (PRD §2.3, §2.5, A19) : le serveur refuse chaque opération
 * qui n'est pas ouverte au profil actif, quel que soit l'affichage.
 */
class DroitsFichesTest extends TestCase
{
    use DatabaseTransactions;
    use SimuleFiches;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpSimulation();
    }

    public function test_only_agent_and_pilot_declare(): void
    {
        foreach (['AGENT', 'PILOTE'] as $role) {
            $this->agir($role)->postJson('/api/fiches', $this->declaration())->assertCreated();
        }

        foreach (['VALIDEUR_PRODUCTION', 'VALIDEUR_HSE', 'CONTROLE_GESTION', 'DIRECTION', 'ADMIN_FONCTIONNEL', 'ADMIN_TECHNIQUE'] as $role) {
            $this->agir($role)->postJson('/api/fiches', $this->declaration())->assertForbidden();
        }
    }

    public function test_declaration_validates_mandatory_fields_origin_precision_and_equipment_unit(): void
    {
        $this->agir('AGENT')->postJson('/api/fiches', [])->assertUnprocessable()
            ->assertJsonValidationErrors(['titre', 'unite_id', 'origine_id', 'enonce_probleme']);

        $this->agir('AGENT')->postJson('/api/fiches', [...$this->declaration(), 'origine_id' => $this->valeur('origine', 'AUTRE')])
            ->assertUnprocessable()->assertJsonValidationErrors('origine_precision');

        $autreUnite = Unite::create(['code' => 'U-'.Str::random(6), 'libelle' => 'Autre', 'actif' => true]);
        $equipement = $autreUnite->equipements()->create(['code' => 'X-1', 'libelle' => 'Équipement', 'actif' => true]);
        $this->agir('AGENT')->postJson('/api/fiches', [...$this->declaration(), 'equipement_id' => $equipement->id])
            ->assertUnprocessable()->assertJsonValidationErrors('equipement_id');
    }

    public function test_only_functional_admin_designates_an_eligible_pilot_while_open(): void
    {
        $fiche = $this->declarer();
        [$pilote] = $this->acteurs['PILOTE'];
        $piloteAilleurs = $this->acteur('PILOTE', Unite::create(['code' => 'U-'.Str::random(6), 'libelle' => 'Ailleurs', 'actif' => true])->id);

        $this->agir('DIRECTION')->patchJson("/api/admin/fiches/{$fiche->id}", ['pilote_id' => $pilote->id])->assertForbidden();
        $this->agir('ADMIN_FONCTIONNEL')->patchJson("/api/admin/fiches/{$fiche->id}", ['pilote_id' => $piloteAilleurs[0]->id])
            ->assertUnprocessable()->assertJsonValidationErrors('pilote_id');

        $this->designerPilote($fiche);
        $this->assertTrue(EvenementHistorique::where('fiche_id', $fiche->id)->where('type', 'DESIGNATION_PILOTE')->exists());
        $this->assertTrue(NotificationInterne::where('fiche_id', $fiche->id)->where('user_id', $pilote->id)->where('type', 'DESIGNATION_PILOTE')->exists());

        $this->transition($fiche, 'PILOTE', 'T2')->assertOk();
        $autrePilote = $this->acteur('PILOTE', $this->unite->id);
        $this->agir('ADMIN_FONCTIONNEL')->patchJson("/api/admin/fiches/{$fiche->id}", ['pilote_id' => $autrePilote[0]->id])
            ->assertUnprocessable()->assertJsonValidationErrors('pilote_id');
    }

    public function test_only_the_designated_pilot_edits_sections_and_starts_the_analysis(): void
    {
        $fiche = $this->declarer();
        $this->designerPilote($fiche);
        $autrePilote = $this->acteur('PILOTE', $this->unite->id);

        $this->agirComme($autrePilote)->postJson("/api/fiches/{$fiche->id}/transitions", ['code' => 'T2'])->assertNotFound();
        $this->transition($fiche, 'AGENT', 'T2')->assertForbidden();
        $this->transition($fiche, 'PILOTE', 'T2')->assertOk();

        foreach (['AGENT', 'DIRECTION', 'ADMIN_FONCTIONNEL', 'VALIDEUR_PRODUCTION'] as $role) {
            $this->agir($role)->putJson("/api/fiches/{$fiche->id}/sections/4", ['objectif_smart' => 'Intrusion'])->assertForbidden();
        }
        // Sans gain, la fiche est hors de la portée du Contrôle de gestion : introuvable plutôt qu'interdite.
        $this->agir('CONTROLE_GESTION')->putJson("/api/fiches/{$fiche->id}/sections/4", ['objectif_smart' => 'Intrusion'])->assertNotFound();
        $this->section($fiche, 4, ['objectif_smart' => 'Objectif du pilote'])->assertOk();
    }

    public function test_functional_admin_changes_confidentiality_but_no_content(): void
    {
        $fiche = $this->declarer();
        $this->designerPilote($fiche);

        $this->agir('ADMIN_FONCTIONNEL')->patchJson("/api/admin/fiches/{$fiche->id}", ['confidentialite' => 'RESTREINT'])->assertOk();
        $this->agir('ADMIN_FONCTIONNEL')->patchJson("/api/admin/fiches/{$fiche->id}", ['titre' => 'Modifié'])->assertUnprocessable();
        $this->assertSame('RESTREINT', $fiche->refresh()->confidentialite);
        $this->assertNotSame('Modifié', $fiche->titre);
        $this->assertTrue(EvenementHistorique::where('fiche_id', $fiche->id)->where('type', 'CHANGEMENT_CONFIDENTIALITE')->exists());

        $this->agir('PILOTE')->postJson("/api/fiches/{$fiche->id}/confidentialite", ['confidentialite' => 'NORMAL', 'motif' => 'Plus sensible'])
            ->assertOk()->assertJsonPath('data.confidentialite', 'NORMAL');
        $this->agir('AGENT')->postJson("/api/fiches/{$fiche->id}/confidentialite", ['confidentialite' => 'RESTREINT'])->assertForbidden();
    }

    public function test_a_comment_can_be_about_an_action_or_a_validation_of_the_fiche(): void
    {
        $ids = $this->amenerEnRealisation();
        $fiche = FicheA3::query()->latest('id')->firstOrFail();
        $validation = $fiche->validations()->orderBy('id')->firstOrFail();
        $url = "/api/fiches/{$fiche->id}/commentaires";

        $this->agir('PILOTE')->postJson($url, ['texte' => 'Purgeurs commandés', 'contexte' => 'ACTION', 'objet_id' => $ids['action']])
            ->assertCreated()
            ->assertJsonPath('data.contexte', 'ACTION')
            ->assertJsonPath('data.cible', 'Action « Remplacer 14 purgeurs »');
        $this->agir('PILOTE')->postJson($url, ['texte' => 'Merci', 'contexte' => 'VALIDATION', 'objet_id' => $validation->id])->assertCreated();
        $this->agir('PILOTE')->postJson($url, ['texte' => 'Général', 'contexte' => 'FICHE', 'objet_id' => $ids['action']])
            ->assertCreated()
            ->assertJsonPath('data.objet_id', null)
            ->assertJsonPath('data.cible', null);

        $autre = $this->declarer();
        $this->designerPilote($autre);
        $this->agir('PILOTE')->postJson("/api/fiches/{$autre->id}/commentaires", ['texte' => 'X', 'contexte' => 'ACTION', 'objet_id' => $ids['action']])
            ->assertUnprocessable()->assertJsonValidationErrors('objet_id');
        $this->agir('PILOTE')->postJson($url, ['texte' => 'X', 'contexte' => 'VALIDATION'])
            ->assertUnprocessable()->assertJsonValidationErrors('objet_id');

        $this->agir('PILOTE')->getJson($url)->assertOk()
            ->assertJsonPath('data.1.cible', 'Validation porte 1 — '.$validation->role->libelle);
    }

    public function test_comment_and_history_access_follow_the_matrix(): void
    {
        $fiche = $this->declarer();
        $this->designerPilote($fiche);

        foreach (['AGENT', 'PILOTE', 'VALIDEUR_PRODUCTION', 'DIRECTION'] as $role) {
            $this->agir($role)->postJson("/api/fiches/{$fiche->id}/commentaires", ['texte' => "Avis {$role}"])->assertCreated();
        }
        $this->agir('ADMIN_FONCTIONNEL')->postJson("/api/fiches/{$fiche->id}/commentaires", ['texte' => 'Admin'])->assertForbidden();
        $this->agir('PILOTE')->getJson("/api/fiches/{$fiche->id}/commentaires")->assertOk()->assertJsonCount(4, 'data');

        foreach (['PILOTE', 'DIRECTION', 'ADMIN_FONCTIONNEL'] as $role) {
            $this->agir($role)->getJson("/api/fiches/{$fiche->id}/historique")->assertOk();
        }
        foreach (['AGENT', 'VALIDEUR_PRODUCTION'] as $role) {
            $this->agir($role)->getJson("/api/fiches/{$fiche->id}/historique")->assertForbidden();
        }
    }

    public function test_hold_is_reserved_to_pilot_and_direction(): void
    {
        $fiche = $this->declarer();
        $this->designerPilote($fiche);
        $this->transition($fiche, 'PILOTE', 'T2')->assertOk();

        foreach (['AGENT', 'VALIDEUR_PRODUCTION', 'ADMIN_FONCTIONNEL'] as $role) {
            $this->transition($fiche, $role, 'T12', 'Blocage')->assertForbidden();
        }
        $this->transition($fiche, 'PILOTE', 'T12', 'Pièces en attente')->assertOk();
        $this->transition($fiche, 'AGENT', 'T13')->assertForbidden();
        $this->transition($fiche, 'DIRECTION', 'T13')->assertOk()->assertJsonPath('data.statut_etape', 'EN_COURS');
    }

    public function test_system_transitions_cannot_be_triggered_by_hand(): void
    {
        $fiche = $this->declarer();
        $this->designerPilote($fiche);

        foreach (['T1', 'T4', 'T5', 'T9', 'T10'] as $code) {
            $this->transition($fiche, 'PILOTE', $code)->assertUnprocessable()->assertJsonValidationErrors('code');
        }
    }

    public function test_responsible_agent_updates_own_action_but_not_others(): void
    {
        $fiche = $this->declarer();
        $ids = $this->amenerEnRealisation($fiche);
        $this->fermerMoc($fiche, $ids['risque']);
        [$pilote] = $this->acteurs['PILOTE'];
        [$agent] = $this->acteurs['AGENT'];
        ActionA3::whereKey($ids['action'])->update(['responsable_id' => $agent->id]);

        $this->agir('AGENT')->postJson("/api/actions/{$ids['action']}/statut", ['statut' => 'EN_COURS'])->assertOk();
        $this->agir('DIRECTION')->postJson("/api/actions/{$ids['action']}/statut", ['statut' => 'REALISE'])->assertForbidden();
        $this->assertNotSame($pilote->id, $agent->id);
    }
}
