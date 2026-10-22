<?php

namespace Tests\Feature;

use App\Models\ActionA3;
use App\Models\Affectation;
use App\Models\Cause;
use App\Models\FicheA3;
use App\Models\FicheA3Domaine;
use App\Models\Gain;
use App\Models\Unite;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\Concerns\SimuleFiches;
use Tests\TestCase;

/**
 * Visibilité des fiches (PRD §2.4, A18, A22) : une fiche hors portée est introuvable (404)
 * dans le détail, le registre, le tableau de bord et toutes ses ressources.
 */
class VisibiliteFichesTest extends TestCase
{
    use DatabaseTransactions;
    use SimuleFiches;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpSimulation();
    }

    public function test_agent_sees_declared_fiches_and_fiches_where_responsible_of_an_action(): void
    {
        $normale = $this->declarer();
        $restreinte = $this->declarer(['confidentialite' => 'RESTREINT']);
        $autreAgent = $this->acteur('AGENT', $this->unite->id);

        $this->voit('AGENT', $normale);
        $this->voit('AGENT', $restreinte);
        $this->nevoitPas($autreAgent, $normale);
        $this->nevoitPas($autreAgent, $restreinte);

        // Responsable d'une action : la fiche, même restreinte, devient visible.
        $cause = Cause::create(['fiche_id' => $restreinte->id, 'numero' => 1, 'methode' => '5_POURQUOI', 'categorie' => 'METHODE', 'libelle' => 'Cause']);
        ActionA3::create(['fiche_id' => $restreinte->id, 'cause_id' => $cause->id, 'description' => 'Action', 'type_action' => 'CORRECTIVE', 'responsable_id' => $autreAgent[0]->id, 'echeance' => today()->addMonth()]);
        $this->voitActeur($autreAgent, $restreinte);
    }

    public function test_pilot_sees_piloted_fiches_but_not_others_restricted_ones(): void
    {
        $pilotee = $this->declarer(['confidentialite' => 'RESTREINT']);
        $this->designerPilote($pilotee);
        $autre = $this->declarer(['confidentialite' => 'RESTREINT']);

        $this->voit('PILOTE', $pilotee);
        $this->nevoitPas($this->acteurs['PILOTE'], $autre);
    }

    public function test_domain_validator_sees_unit_fiches_of_its_domain_and_restricted_only_when_solicited(): void
    {
        $avecQhse = $this->declarer();
        FicheA3Domaine::create(['fiche_id' => $avecQhse->id, 'domaine' => 'QHSE', 'valideur_role_id' => $this->roleId('VALIDEUR_HSE')]);
        $sansQhse = $this->declarer();
        $restreinte = $this->declarer(['confidentialite' => 'RESTREINT']);
        FicheA3Domaine::create(['fiche_id' => $restreinte->id, 'domaine' => 'QHSE', 'valideur_role_id' => $this->roleId('VALIDEUR_HSE')]);

        $autreUnite = Unite::create(['code' => 'U-'.Str::random(6), 'libelle' => 'Autre unité', 'actif' => true]);
        $horsPerimetre = FicheA3::create(['numero_a3' => 'A3-1998-'.random_int(100, 999), 'titre' => 'Hors périmètre', 'enonce_probleme' => 'E', 'unite_id' => $autreUnite->id, 'declarant_id' => $this->acteurs['AGENT'][0]->id]);
        FicheA3Domaine::create(['fiche_id' => $horsPerimetre->id, 'domaine' => 'QHSE', 'valideur_role_id' => $this->roleId('VALIDEUR_HSE')]);

        $this->voit('VALIDEUR_HSE', $avecQhse);
        $this->nevoitPas($this->acteurs['VALIDEUR_HSE'], $sansQhse);
        $this->nevoitPas($this->acteurs['VALIDEUR_HSE'], $restreinte);
        $this->nevoitPas($this->acteurs['VALIDEUR_HSE'], $horsPerimetre);

        // Production / Exploitation est toujours sollicitée : elle voit les fiches Normal de son unité.
        $this->voit('VALIDEUR_PRODUCTION', $sansQhse);
    }

    public function test_solicited_validator_sees_restricted_fiche(): void
    {
        $fiche = $this->declarer(['confidentialite' => 'RESTREINT']);
        $this->designerPilote($fiche);
        $this->transition($fiche, 'PILOTE', 'T2')->assertOk();
        $this->completerPlan($fiche);
        $this->nevoitPas($this->acteurs['VALIDEUR_HSE'], $fiche);

        $this->transition($fiche, 'PILOTE', 'T3')->assertOk();
        $this->voit('VALIDEUR_HSE', $fiche);
    }

    public function test_management_control_sees_fiches_with_gains_only(): void
    {
        $sansGain = $this->declarer();
        $avecGain = $this->declarer();
        $restreinteValidee = $this->declarer(['confidentialite' => 'RESTREINT']);
        $restreinteProposee = $this->declarer(['confidentialite' => 'RESTREINT']);
        $this->gain($avecGain, 'VALIDE');
        $this->gain($restreinteValidee, 'VALIDE');
        $this->gain($restreinteProposee, 'PROPOSE');

        $this->nevoitPas($this->acteurs['CONTROLE_GESTION'], $sansGain);
        $this->voit('CONTROLE_GESTION', $avecGain);
        $this->nevoitPas($this->acteurs['CONTROLE_GESTION'], $restreinteValidee);
        $this->voit('CONTROLE_GESTION', $restreinteProposee);
    }

    public function test_direction_and_functional_admin_see_everything_technical_admin_nothing(): void
    {
        $restreinte = $this->declarer(['confidentialite' => 'RESTREINT']);

        $this->voit('DIRECTION', $restreinte);
        $this->voit('ADMIN_FONCTIONNEL', $restreinte);
        $this->nevoitPas($this->acteurs['ADMIN_TECHNIQUE'], $restreinte);
        $this->agir('ADMIN_TECHNIQUE')->getJson('/api/fiches')->assertOk()->assertJsonPath('meta.total', 0);
        $this->agir('ADMIN_TECHNIQUE')->getJson('/api/tableau-de-bord')->assertOk()->assertJsonPath('data.fiches_total', 0);
    }

    public function test_invisible_fiche_resources_are_not_found(): void
    {
        $fiche = $this->declarer(['confidentialite' => 'RESTREINT']);
        $intrus = $this->acteur('AGENT', $this->unite->id);

        foreach (['', '/historique', '/commentaires', '/options'] as $suffixe) {
            $this->agirComme($intrus)->getJson("/api/fiches/{$fiche->id}{$suffixe}")->assertNotFound();
        }
        $this->agirComme($intrus)->postJson("/api/fiches/{$fiche->id}/commentaires", ['texte' => 'Indiscret'])->assertNotFound();
        $this->agirComme($intrus)->postJson("/api/fiches/{$fiche->id}/transitions", ['code' => 'T12', 'motif' => 'x'])->assertNotFound();
        $this->agirComme($intrus)->getJson('/api/fiches?q='.$fiche->numero_a3)->assertOk()->assertJsonPath('meta.total', 0);
    }

    private function voit(string $role, FicheA3 $fiche): void
    {
        $this->voitActeur($this->acteurs[$role], $fiche);
    }

    /**
     * @param  array{0: User, 1: Affectation}  $acteur
     */
    private function voitActeur(array $acteur, FicheA3 $fiche): void
    {
        $this->agirComme($acteur)->getJson("/api/fiches/{$fiche->id}")->assertOk();
        $this->agirComme($acteur)->getJson('/api/fiches?q='.$fiche->numero_a3)->assertOk()->assertJsonPath('meta.total', 1);
    }

    /**
     * @param  array{0: User, 1: Affectation}  $acteur
     */
    private function nevoitPas(array $acteur, FicheA3 $fiche): void
    {
        $this->agirComme($acteur)->getJson("/api/fiches/{$fiche->id}")->assertNotFound();
        $this->agirComme($acteur)->getJson('/api/fiches?q='.$fiche->numero_a3)->assertOk()->assertJsonPath('meta.total', 0);
    }

    private function gain(FicheA3 $fiche, string $statut): void
    {
        Gain::create(['fiche_id' => $fiche->id, 'categorie' => 'AUTRES', 'hypothese_calcul' => 'H', 'quantite' => 1, 'unite' => 'u', 'cout_unitaire' => 1000, 'montant_annuel' => 1000, 'statut' => $statut]);
    }
}
