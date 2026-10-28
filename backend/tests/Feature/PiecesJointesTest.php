<?php

namespace Tests\Feature;

use App\Models\ActionA3;
use App\Models\Cause;
use App\Models\Controle;
use App\Models\Parametre;
use App\Models\PieceJointe;
use App\Models\Risque;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\SimuleFiches;
use Tests\TestCase;

class PiecesJointesTest extends TestCase
{
    use RefreshDatabase;
    use SimuleFiches;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpSimulation();
        Storage::fake('local');
    }

    public function test_designated_pilot_can_attach_to_a_fiche_and_visible_profiles_can_download_it(): void
    {
        $fiche = $this->declarer();
        $this->designerPilote($fiche);

        $response = $this->agir('PILOTE')->post("/api/fiches/{$fiche->id}/pieces-jointes", [
            'fichier' => UploadedFile::fake()->image('preuve.png'),
        ], ['Accept' => 'application/json'])->assertCreated();

        $piece = PieceJointe::findOrFail($response->json('data.id'));
        Storage::disk('local')->assertExists($piece->nom_stockage);
        $this->assertNull($piece->objet_id);
        $this->assertSame('image/png', $piece->type_mime);

        $this->agir('DIRECTION')->getJson("/api/fiches/{$fiche->id}/pieces-jointes")
            ->assertOk()
            ->assertJsonPath('data.0.nom', 'preuve.png');

        $this->agir('DIRECTION')->get("/api/pieces-jointes/{$piece->id}/telechargement")
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff');
    }

    public function test_agent_can_attach_only_to_an_action_the_agent_is_responsible_for(): void
    {
        $fiche = $this->declarer();
        $this->designerPilote($fiche);
        [$agent] = $this->acteurs['AGENT'];
        $cause = Cause::create([
            'fiche_id' => $fiche->id,
            'numero' => 1,
            'categorie' => 'METHODE',
            'libelle' => 'Cause',
        ]);
        $action = ActionA3::create([
            'fiche_id' => $fiche->id,
            'cause_id' => $cause->id,
            'description' => 'Action confiée à l’agent',
            'type_action' => 'CORRECTIVE',
            'responsable_id' => $agent->id,
            'echeance' => today()->addWeek(),
        ]);

        $upload = fn () => UploadedFile::fake()->image('preuve.png');
        $this->agirComme($this->acteurs['AGENT'])->post("/api/fiches/{$fiche->id}/pieces-jointes", [
            'fichier' => $upload(),
        ], ['Accept' => 'application/json'])->assertForbidden();

        $this->agirComme($this->acteurs['AGENT'])->post("/api/fiches/{$fiche->id}/pieces-jointes", [
            'fichier' => $upload(),
            'action_id' => $action->id,
        ], ['Accept' => 'application/json'])->assertCreated();

        $anotherAction = ActionA3::create([
            'fiche_id' => $fiche->id,
            'cause_id' => $cause->id,
            'description' => 'Action d’un autre responsable',
            'type_action' => 'CORRECTIVE',
            'responsable_id' => $this->acteurs['PILOTE'][0]->id,
            'echeance' => today()->addWeek(),
        ]);
        $this->agirComme($this->acteurs['AGENT'])->post("/api/fiches/{$fiche->id}/pieces-jointes", [
            'fichier' => $upload(),
            'action_id' => $anotherAction->id,
        ], ['Accept' => 'application/json'])->assertForbidden();
    }

    public function test_a_pilot_responsible_for_an_action_on_another_fiche_can_attach_to_that_action_only(): void
    {
        $fiche = $this->declarer();
        $this->designerPilote($fiche);
        $responsable = $this->acteur('PILOTE', $this->unite->id);
        $cause = Cause::create([
            'fiche_id' => $fiche->id,
            'numero' => 1,
            'categorie' => 'METHODE',
            'libelle' => 'Cause',
        ]);
        $action = ActionA3::create([
            'fiche_id' => $fiche->id,
            'cause_id' => $cause->id,
            'description' => 'Action confiée à un autre pilote',
            'type_action' => 'CORRECTIVE',
            'responsable_id' => $responsable[0]->id,
            'echeance' => today()->addWeek(),
        ]);

        $this->agirComme($responsable)->getJson("/api/fiches/{$fiche->id}")
            ->assertOk()
            ->assertJsonPath('data.droits.peut_ajouter_piece_jointe', true);

        $this->agirComme($responsable)->post("/api/fiches/{$fiche->id}/pieces-jointes", [
            'fichier' => UploadedFile::fake()->image('preuve.png'),
        ], ['Accept' => 'application/json'])->assertForbidden();

        $this->agirComme($responsable)->post("/api/fiches/{$fiche->id}/pieces-jointes", [
            'fichier' => UploadedFile::fake()->image('preuve.png'),
            'action_id' => $action->id,
        ], ['Accept' => 'application/json'])->assertCreated();
    }

    public function test_perennisation_proof_can_be_a_document_or_an_image(): void
    {
        $fiche = $this->declarer();
        $ids = $this->amenerEnRealisation($fiche);
        $this->amenerEnVerification($fiche, $ids);

        $ligne = $this->section($fiche, 10, ['perennisation' => [['type' => 'SOP', 'statut' => 'REALISE']]])
            ->assertOk()
            ->assertJsonPath('data.perennisation.0.preuve', null)
            ->json('data.perennisation.0.id');

        $this->agir('PILOTE')->post("/api/fiches/{$fiche->id}/pieces-jointes", [
            'fichier' => UploadedFile::fake()->image('sop-signee.jpg'),
            'perennisation_id' => $ligne,
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.perennisation_id', $ligne)
            ->assertJsonPath('data.action_id', null);

        $this->agir('PILOTE')->post("/api/fiches/{$fiche->id}/pieces-jointes", [
            'fichier' => UploadedFile::fake()->image('x.png'),
            'perennisation_id' => $ligne,
            'action_id' => $ids['action'],
        ], ['Accept' => 'application/json'])->assertUnprocessable();
    }

    public function test_cause_and_moc_proofs_can_be_attached_as_a_file_or_a_photo(): void
    {
        $fiche = $this->declarer();
        $this->designerPilote($fiche);
        $cause = Cause::create(['fiche_id' => $fiche->id, 'numero' => 1, 'categorie' => 'METHODE', 'libelle' => 'Cause']);
        $risque = Risque::create(['fiche_id' => $fiche->id, 'domaine' => 'HSE', 'description' => 'Fuite vapeur', 'moc_requis' => true]);
        $autreFiche = $this->declarer();
        // Une vraie photo PNG d'un pixel et un vrai début de PDF : le type est lu dans le contenu.
        $photo = fn (string $nom) => UploadedFile::fake()->createWithContent($nom, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='));
        $causeAilleurs = Cause::create(['fiche_id' => $autreFiche->id, 'numero' => 1, 'categorie' => 'METHODE', 'libelle' => 'Autre']);

        $this->agir('PILOTE')->post("/api/fiches/{$fiche->id}/pieces-jointes", [
            'fichier' => $photo('releve.png'),
            'cause_id' => $cause->id,
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.objet', 'cause')
            ->assertJsonPath('data.objet_id', $cause->id);

        $this->agir('PILOTE')->post("/api/fiches/{$fiche->id}/pieces-jointes", [
            'fichier' => UploadedFile::fake()->createWithContent('moc-cloture.pdf', "%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n"),
            'risque_id' => $risque->id,
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.objet', 'risque');

        $this->agir('PILOTE')->post("/api/fiches/{$fiche->id}/pieces-jointes", [
            'fichier' => $photo('x.png'),
            'cause_id' => $causeAilleurs->id,
        ], ['Accept' => 'application/json'])->assertNotFound();

        $this->agir('PILOTE')->post("/api/fiches/{$fiche->id}/pieces-jointes", [
            'fichier' => $photo('x.png'),
            'cause_id' => $cause->id,
            'risque_id' => $risque->id,
        ], ['Accept' => 'application/json'])->assertUnprocessable();
    }

    public function test_done_standard_needs_a_reference_or_a_document_before_closure(): void
    {
        $fiche = $this->declarer();
        $ids = $this->amenerEnRealisation($fiche);
        $this->amenerEnVerification($fiche, $ids);
        foreach (Controle::where('action_id', $ids['action'])->get() as $controle) {
            $this->controle($controle, 'CONFORME')->assertOk();
        }
        $this->mesurerMaintien($fiche);
        $this->completerCloture($fiche);

        $ligne = $this->section($fiche, 10, ['perennisation' => [['type' => 'SOP', 'statut' => 'REALISE']]])
            ->assertOk()
            ->assertJsonPath('data.perennisation.0.preuve_manquante', true)
            ->json('data.perennisation.0.id');
        $message = collect($this->transition($fiche, 'PILOTE', 'T8')->assertUnprocessable()->json('manques'))->implode(' ');
        $this->assertStringContainsString('réalisée sans preuve', $message);

        $this->agir('PILOTE')->post("/api/fiches/{$fiche->id}/pieces-jointes", [
            'fichier' => UploadedFile::fake()->image('sop-signee.jpg'),
            'perennisation_id' => $ligne,
        ], ['Accept' => 'application/json'])->assertCreated();

        $this->agir('PILOTE')->getJson("/api/fiches/{$fiche->id}")->assertOk()
            ->assertJsonPath('data.perennisation.0.fichiers', 1)
            ->assertJsonPath('data.perennisation.0.preuve_manquante', false);
        $this->transition($fiche, 'PILOTE', 'T8')->assertOk()->assertJsonPath('data.statut_etape', 'EN_VALIDATION_CLOTURE');
    }

    public function test_upload_rejects_unapproved_file_types_and_enforces_configured_file_count(): void
    {
        $fiche = $this->declarer();
        $this->designerPilote($fiche);
        Parametre::updateOrCreate(['cle' => 'attachment_max_files'], ['valeur' => '1']);

        $this->agir('PILOTE')->post("/api/fiches/{$fiche->id}/pieces-jointes", [
            'fichier' => UploadedFile::fake()->create('malware.exe', 4, 'application/x-msdownload'),
        ], ['Accept' => 'application/json'])->assertUnprocessable();

        $this->agir('PILOTE')->post("/api/fiches/{$fiche->id}/pieces-jointes", [
            'fichier' => UploadedFile::fake()->image('preuve.png'),
        ], ['Accept' => 'application/json'])->assertCreated();

        $this->agir('PILOTE')->post("/api/fiches/{$fiche->id}/pieces-jointes", [
            'fichier' => UploadedFile::fake()->image('deuxieme.png'),
        ], ['Accept' => 'application/json'])->assertUnprocessable();

        $this->assertSame(1, PieceJointe::where('fiche_id', $fiche->id)->count());
    }

    public function test_upload_and_download_respect_confidentiality_and_technical_admin_cannot_access_files(): void
    {
        $fiche = $this->declarer(['confidentialite' => 'RESTREINT']);
        $this->designerPilote($fiche);
        $piece = $this->agir('PILOTE')->post("/api/fiches/{$fiche->id}/pieces-jointes", [
            'fichier' => UploadedFile::fake()->image('preuve.png'),
        ], ['Accept' => 'application/json'])->assertCreated()->json('data.id');
        $agent = $this->acteur('AGENT', $this->unite->id);

        $this->agirComme($agent)->getJson("/api/fiches/{$fiche->id}/pieces-jointes")->assertNotFound();
        $this->agir('ADMIN_TECHNIQUE')->get("/api/pieces-jointes/{$piece}/telechargement")->assertNotFound();
    }
}
