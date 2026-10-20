<?php

namespace Tests\Feature;

use App\Models\JournalAdministration;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\SimuleFiches;
use Tests\TestCase;

/**
 * Écran Droits : l'administrateur fonctionnel accorde ou retire un droit réglable à un rôle,
 * et le serveur applique aussitôt la nouvelle matrice.
 */
class DroitsRolesTest extends TestCase
{
    use DatabaseTransactions;
    use SimuleFiches;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpSimulation();
    }

    public function test_matrix_starts_from_the_prd_and_is_reserved_to_the_functional_admin(): void
    {
        $this->agir('DIRECTION')->getJson('/api/admin/permissions')->assertForbidden();
        $this->agir('DIRECTION')->putJson('/api/admin/permissions', $this->cellule('DIRECTION', 'DECLARER_FICHE', true))->assertForbidden();

        $permissions = collect($this->agir('ADMIN_FONCTIONNEL')->getJson('/api/admin/permissions')->assertOk()->json('data.permissions'))->keyBy('code');
        $this->assertEqualsCanonicalizing(
            [$this->roleId('AGENT'), $this->roleId('PILOTE')],
            $permissions['DECLARER_FICHE']['roles_accordes'],
        );
        $this->assertEqualsCanonicalizing(
            $permissions['RELANCER']['roles_par_defaut'],
            $permissions['RELANCER']['roles_accordes'],
        );
    }

    public function test_granting_and_removing_declaration_takes_effect_and_is_journaled(): void
    {
        $this->agir('DIRECTION')->postJson('/api/fiches', $this->declaration())->assertForbidden();

        $this->agir('ADMIN_FONCTIONNEL')->putJson('/api/admin/permissions', $this->cellule('DIRECTION', 'DECLARER_FICHE', true))->assertOk();
        $this->assertContains('DECLARER_FICHE', $this->agir('DIRECTION')->getJson('/api/auth/moi')->assertOk()->json('profil_actif.permissions'));
        $this->agir('DIRECTION')->postJson('/api/fiches', $this->declaration())->assertCreated();
        $this->assertTrue(JournalAdministration::where('operation', 'ACCORD_DROIT')->where('objet', 'role:'.$this->roleId('DIRECTION'))->exists());

        $this->agir('ADMIN_FONCTIONNEL')->putJson('/api/admin/permissions', $this->cellule('AGENT', 'DECLARER_FICHE', false))->assertOk();
        $this->agir('AGENT')->postJson('/api/fiches', $this->declaration())->assertForbidden();
        $this->assertTrue(JournalAdministration::where('operation', 'RETRAIT_DROIT')->exists());
    }

    public function test_locked_cells_cannot_be_granted(): void
    {
        $this->agir('ADMIN_FONCTIONNEL')->putJson('/api/admin/permissions', $this->cellule('ADMIN_FONCTIONNEL', 'COMMENTER', true))
            ->assertUnprocessable()->assertJsonValidationErrors('role_id');
        $this->agir('ADMIN_FONCTIONNEL')->putJson('/api/admin/permissions', $this->cellule('VALIDEUR_HSE', 'DECLARER_FICHE', true))
            ->assertUnprocessable();
        $this->agir('ADMIN_FONCTIONNEL')->putJson('/api/admin/permissions', $this->cellule('DIRECTION', 'VALIDER_CLOTURE', true))
            ->assertUnprocessable()->assertJsonValidationErrors('permission');
    }

    public function test_history_and_hold_follow_the_matrix_but_the_pilot_keeps_their_rights(): void
    {
        $fiche = $this->declarer();
        $this->designerPilote($fiche);
        $this->transition($fiche, 'PILOTE', 'T2')->assertOk();

        $this->agir('ADMIN_FONCTIONNEL')->putJson('/api/admin/permissions', $this->cellule('DIRECTION', 'VOIR_HISTORIQUE', false))->assertOk();
        $this->agir('DIRECTION')->getJson("/api/fiches/{$fiche->id}/historique")->assertForbidden();

        $this->agir('ADMIN_FONCTIONNEL')->putJson('/api/admin/permissions', $this->cellule('PILOTE', 'METTRE_EN_ATTENTE', false))->assertOk();
        $this->agir('ADMIN_FONCTIONNEL')->putJson('/api/admin/permissions', $this->cellule('DIRECTION', 'METTRE_EN_ATTENTE', false))->assertOk();
        $this->transition($fiche, 'DIRECTION', 'T12', 'Arrêt technique')->assertForbidden();
        $this->transition($fiche, 'PILOTE', 'T12', 'Arrêt technique')->assertOk();

        $this->agir('ADMIN_FONCTIONNEL')->putJson('/api/admin/permissions', $this->cellule('DIRECTION', 'METTRE_EN_ATTENTE', true))->assertOk();
        $this->agir('DIRECTION')->getJson("/api/fiches/{$fiche->id}")->assertOk()->assertJsonPath('data.droits.transitions', ['T13']);
        $this->transition($fiche, 'DIRECTION', 'T13')->assertOk();
    }

    /**
     * @return array{role_id: int, permission: string, accorde: bool}
     */
    private function cellule(string $role, string $permission, bool $accorde): array
    {
        return ['role_id' => $this->roleId($role), 'permission' => $permission, 'accorde' => $accorde];
    }
}
