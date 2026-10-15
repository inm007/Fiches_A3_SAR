<?php

namespace Tests\Feature;

use App\Models\ActionA3;
use App\Models\Cause;
use App\Models\Parametre;
use App\Models\PieceJointe;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\SimuleFiches;
use Tests\TestCase;

class PiecesJointesTest extends TestCase
{
    use DatabaseTransactions;
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
            'methode' => '5_POURQUOI',
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
