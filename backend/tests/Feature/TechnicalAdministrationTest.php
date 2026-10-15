<?php

namespace Tests\Feature;

use App\Models\Affectation;
use App\Models\JournalAdministration;
use App\Models\Parametre;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Crypt;
use Tests\TestCase;

class TechnicalAdministrationTest extends TestCase
{
    use DatabaseTransactions;

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
            ->assertJsonStructure(['data' => ['smtp' => ['SMTP_HOST', 'SMTP_PASSWORD_SET'], 'logs']]);
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
            $this->putJson('/api/technique/settings', ['cle' => 'SMTP_HOST', 'valeur' => 'smtp.test'])
                ->assertForbidden();
        }
    }

    public function test_technical_administrator_cannot_reach_functional_administration(): void
    {
        $this->actingAsActiveRole('ADMIN_TECHNIQUE');

        $this->getJson('/api/admin/users')->assertForbidden();
    }

    public function test_smtp_password_is_encrypted_never_returned_and_audited_without_value(): void
    {
        $this->actingAsActiveRole('ADMIN_TECHNIQUE');

        $this->putJson('/api/technique/settings', ['cle' => 'SMTP_PASSWORD', 'valeur' => 'mot-de-passe-smtp'])
            ->assertOk();

        $stored = Parametre::where('cle', 'SMTP_PASSWORD')->value('valeur');
        $this->assertNotSame('mot-de-passe-smtp', $stored);
        $this->assertSame('mot-de-passe-smtp', Crypt::decryptString($stored));

        $response = $this->getJson('/api/technique')
            ->assertOk()
            ->assertJsonPath('data.smtp.SMTP_PASSWORD_SET', true);
        $this->assertStringNotContainsString('mot-de-passe-smtp', $response->getContent());
        $this->assertStringNotContainsString($stored, $response->getContent());

        $entry = JournalAdministration::where('objet', 'parametre:SMTP_PASSWORD')->latest('id')->firstOrFail();
        $this->assertSame('[masqué]', $entry->detail['valeur']);
    }

    public function test_only_whitelisted_smtp_keys_can_be_updated(): void
    {
        $this->actingAsActiveRole('ADMIN_TECHNIQUE');

        $this->putJson('/api/technique/settings', ['cle' => 'reminder_interval_days', 'valeur' => '1'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('cle');
        $this->putJson('/api/technique/settings', ['cle' => 'SMTP_PORT', 'valeur' => 'abc'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('valeur');

        $this->putJson('/api/technique/settings', ['cle' => 'SMTP_HOST', 'valeur' => 'smtp.sar.test'])
            ->assertOk();
        $this->assertSame('smtp.sar.test', Parametre::where('cle', 'SMTP_HOST')->value('valeur'));
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
