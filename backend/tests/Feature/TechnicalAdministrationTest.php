<?php

namespace Tests\Feature;

use App\Models\Affectation;
use App\Models\JournalAdministration;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TechnicalAdministrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        config(['session.driver' => 'array']);
        config(['sanctum.stateful' => array_merge(config('sanctum.stateful'), ['localhost:5173'])]);
        $this->withHeaders([
            'Origin' => 'http://localhost:5173',
            'Referer' => 'http://localhost:5173/',
        ]);
    }

    public function test_technical_administrator_can_read_the_technical_overview(): void
    {
        $this->actingAsActiveRole('ADMIN_TECHNIQUE');

        $this->getJson('/api/technique')
            ->assertOk()
            ->assertJsonPath('data.auth_provider', 'local')
            ->assertJsonPath('data.sap_enabled', false)
            ->assertJsonPath('data.mail_mailer', config('mail.default'));
    }

    public function test_technical_logs_can_be_searched_filtered_and_paginated(): void
    {
        $user = $this->actingAsActiveRole('ADMIN_TECHNIQUE');
        JournalAdministration::create([
            'auteur_id' => $user->id,
            'operation' => 'TEST_RECHERCHE',
            'objet' => 'objet:unique',
            'detail' => ['valeur' => 'visible'],
            'created_at' => now(),
        ]);
        JournalAdministration::create([
            'auteur_id' => $user->id,
            'operation' => 'TEST_AUTRE',
            'objet' => 'objet:autre',
            'detail' => [],
            'created_at' => now()->subMinute(),
        ]);

        $this->getJson('/api/technique/logs?q=unique TEST_RECHERCHE&per_page=1')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.operation', 'TEST_RECHERCHE')
            ->assertJsonPath('data.0.auteur', trim($user->prenom.' '.$user->nom));

        $this->getJson('/api/technique/logs?operation=TEST_AUTRE')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.objet', 'objet:autre');
    }

    public function test_other_profiles_cannot_reach_the_technical_api(): void
    {
        foreach (['AGENT', 'ADMIN_FONCTIONNEL', 'DIRECTION'] as $roleCode) {
            $this->actingAsActiveRole($roleCode);

            $this->getJson('/api/technique')->assertForbidden();
            $this->getJson('/api/technique/logs')->assertForbidden();
        }
    }

    public function test_technical_administrator_cannot_reach_functional_administration(): void
    {
        $this->actingAsActiveRole('ADMIN_TECHNIQUE');

        $this->getJson('/api/admin/users')->assertForbidden();
    }

    private function actingAsActiveRole(string $roleCode): User
    {
        $role = Role::where('code', $roleCode)->firstOrFail();
        $user = User::factory()->create(['identifiant' => strtolower($roleCode).'.'.uniqid()]);
        $assignment = Affectation::create([
            'user_id' => $user->id,
            'role_id' => $role->id,
            'unite_id' => null,
            'actif' => true,
        ]);

        $this->actingAs($user)->withSession(['auth.active_assignment_id' => $assignment->id]);

        return $user;
    }
}
