<?php

namespace Tests\Feature;

use App\Models\ValeurListe;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\SimuleFiches;
use Tests\TestCase;

/**
 * Options créées depuis la fiche sous « Autre » : enregistrées comme les autres valeurs de la liste,
 * mises en forme, sans doublon, puis proposées à tous dans /referentiels.
 */
class OptionsAutreTest extends TestCase
{
    use RefreshDatabase;
    use SimuleFiches;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpSimulation();
    }

    public function test_an_option_created_from_a_fiche_is_stored_under_other_and_offered_to_everyone(): void
    {
        $autre = $this->valeur('origine', 'AUTRE');

        $creee = $this->agir('PILOTE')->postJson('/api/referentiels/origine/autres', ['libelle' => '  visite   de sécurité. '])
            ->assertCreated()
            ->assertJsonPath('existait', false)
            ->assertJsonPath('data.libelle', 'Visite de sécurité')
            ->assertJsonPath('data.code', 'VISITE_DE_SECURITE')
            ->assertJsonPath('data.parent_id', $autre)
            ->json('data');

        $this->assertDatabaseHas('valeurs_listes', ['id' => $creee['id'], 'cree_par_id' => $this->acteurs['PILOTE'][0]->id, 'actif' => true]);
        $this->assertDatabaseHas('journal_administration', ['operation' => 'CREATION_DEPUIS_FICHE', 'objet' => 'valeur_liste:'.$creee['id']]);

        $this->agir('AGENT')->getJson('/api/referentiels')
            ->assertOk()
            ->assertJsonFragment(['id' => $creee['id'], 'parent_id' => $autre, 'code' => 'VISITE_DE_SECURITE', 'libelle' => 'Visite de sécurité']);

        // La même option, autrement écrite, est renvoyée au lieu d'être créée deux fois.
        $this->agir('AGENT')->postJson('/api/referentiels/origine/autres', ['libelle' => 'VISITES DE SECURITE'])
            ->assertOk()
            ->assertJsonPath('existait', true)
            ->assertJsonPath('data.id', $creee['id']);
    }

    public function test_the_created_option_can_be_chosen_on_the_fiche(): void
    {
        $fiche = $this->declarer();
        $this->lancer($fiche);
        $code = $this->agir('PILOTE')->postJson('/api/referentiels/methode_analyse/autres', ['libelle' => 'Arbre des causes'])
            ->assertCreated()
            ->json('data.code');

        $this->section($fiche, 5, [
            'methode_analyse' => $code,
            'causes' => [['categorie' => 'METHODE', 'libelle' => 'Pas de plan d’inspection', 'niveau' => 1, 'racine' => true]],
        ])->assertOk();

        $this->assertSame('ARBRE_DES_CAUSES', $fiche->refresh()->methode_analyse);
    }

    public function test_vague_duplicate_or_misplaced_options_are_refused(): void
    {
        $this->agir('PILOTE')->postJson('/api/referentiels/origine/autres', ['libelle' => 'Divers'])
            ->assertUnprocessable()->assertJsonValidationErrors('libelle');
        $this->agir('PILOTE')->postJson('/api/referentiels/origine/autres', ['libelle' => 'ab'])
            ->assertUnprocessable()->assertJsonValidationErrors('libelle');
        $this->agir('PILOTE')->postJson('/api/referentiels/origine/autres', ['libelle' => 'audits'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.libelle.0', 'Cette option existe déjà : choisissez « Audit » dans la liste.');

        // Une liste sans « Autre » n'accepte pas d'option créée depuis la fiche.
        $this->agir('PILOTE')->postJson('/api/referentiels/frequence/autres', ['libelle' => 'Trimestrielle'])
            ->assertUnprocessable()->assertJsonValidationErrors('libelle');
        $this->assertFalse(ValeurListe::query()->deLaListe('frequence')->where('libelle', 'Trimestrielle')->exists());
    }

    public function test_only_the_people_who_fill_a_fiche_create_options(): void
    {
        $this->agir('DIRECTION')->postJson('/api/referentiels/origine/autres', ['libelle' => 'Visite client'])
            ->assertForbidden();
    }
}
