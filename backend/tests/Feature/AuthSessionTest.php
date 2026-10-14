<?php

namespace Tests\Feature;

use App\Models\Affectation;
use App\Models\Role;
use App\Models\Unite;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\TestCase;

class AuthSessionTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        config(['session.driver' => 'array']);
        config(['cache.default' => 'array']);
        config(['sanctum.stateful' => array_merge(config('sanctum.stateful'), ['localhost:5173'])]);
        $this->withHeaders([
            'Origin' => 'http://localhost:5173',
            'Referer' => 'http://localhost:5173/',
        ]);
    }

    public function test_valid_login_sets_active_profile_and_redirects_to_its_dashboard(): void
    {
        [$user] = $this->createAssignedUser('AGENT');

        $response = $this->postJson('/api/auth/connexion', [
            'identifiant' => $user->identifiant,
            'password' => 'password',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('user.identifiant', $user->identifiant)
            ->assertJsonPath('profil_actif.role_code', 'AGENT')
            ->assertJsonPath('redirect_to', '/tableau-de-bord');

        $this->assertNotNull($user->fresh()->derniere_connexion);
        Auth::forgetGuards();
        $this->getJson('/api/auth/moi')->assertOk()->assertJsonPath('profil_actif.role_code', 'AGENT');
    }

    public function test_technical_administrator_is_sent_to_the_technical_home(): void
    {
        [$user] = $this->createAssignedUser('ADMIN_TECHNIQUE');

        $this->postJson('/api/auth/connexion', [
            'identifiant' => $user->identifiant,
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJsonPath('redirect_to', '/technique');
    }

    public function test_unknown_identifier_and_wrong_password_return_the_same_message(): void
    {
        [$user] = $this->createAssignedUser('AGENT');

        $unknown = $this->postJson('/api/auth/connexion', [
            'identifiant' => 'unknown.user',
            'password' => 'wrong-password',
        ]);
        $wrongPassword = $this->postJson('/api/auth/connexion', [
            'identifiant' => $user->identifiant,
            'password' => 'wrong-password',
        ]);

        $unknown->assertUnauthorized()->assertJsonPath('message', 'Identifiant ou mot de passe incorrect.');
        $wrongPassword->assertUnauthorized()->assertJsonPath('message', 'Identifiant ou mot de passe incorrect.');
    }

    public function test_user_without_an_active_assignment_cannot_sign_in(): void
    {
        $user = User::factory()->create(['identifiant' => 'sans.affectation']);

        $this->postJson('/api/auth/connexion', [
            'identifiant' => $user->identifiant,
            'password' => 'password',
        ])
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Identifiant ou mot de passe incorrect.');
    }

    public function test_sixth_failed_login_is_rate_limited(): void
    {
        $this->freezeTime();

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/auth/connexion', [
                'identifiant' => 'locked.user',
                'password' => 'wrong-password',
            ])->assertUnauthorized();
        }

        $this->postJson('/api/auth/connexion', [
            'identifiant' => 'locked.user',
            'password' => 'wrong-password',
        ])
            ->assertTooManyRequests()
            ->assertJsonPath('retry_after', 900);
    }

    public function test_authenticated_user_can_switch_only_to_their_own_active_profile(): void
    {
        [$user, $agentAssignment] = $this->createAssignedUser('AGENT');
        $technicalRole = Role::firstOrCreate(
            ['code' => 'ADMIN_TECHNIQUE'],
            ['libelle' => 'Administrateur technique'],
        );
        $technicalAssignment = Affectation::create([
            'user_id' => $user->id,
            'role_id' => $technicalRole->id,
            'actif' => true,
        ]);
        $this->createAssignedUser('PILOTE', 'other.user');

        $this->postJson('/api/auth/connexion', [
            'identifiant' => $user->identifiant,
            'password' => 'password',
        ])->assertOk()->assertJsonPath('profil_actif.affectation_id', $agentAssignment->id);

        $this->postJson('/api/auth/profil-actif', ['affectation_id' => $technicalAssignment->id])
            ->assertOk()
            ->assertJsonPath('profil_actif.role_code', 'ADMIN_TECHNIQUE')
            ->assertJsonPath('redirect_to', '/technique');

        $this->postJson('/api/auth/profil-actif', ['affectation_id' => 9999])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('affectation_id');
    }

    public function test_logout_invalidates_the_authenticated_session(): void
    {
        [$user] = $this->createAssignedUser('AGENT');
        $this->postJson('/api/auth/connexion', [
            'identifiant' => $user->identifiant,
            'password' => 'password',
        ])->assertOk();

        $this->postJson('/api/auth/deconnexion')->assertOk();
        Auth::forgetGuards();
        $this->getJson('/api/auth/moi')->assertUnauthorized();
    }

    public function test_password_reset_request_is_generic_and_sends_only_to_local_accounts(): void
    {
        Notification::fake();
        $localUser = User::factory()->create([
            'identifiant' => 'local.reset',
            'email' => 'local.reset@example.test',
            'auth_source' => 'local',
        ]);
        $ldapUser = User::factory()->create([
            'identifiant' => 'ldap.reset',
            'email' => 'ldap.reset@example.test',
            'auth_source' => 'ldap',
        ]);

        $localResponse = $this->postJson('/api/auth/mot-de-passe-oublie', ['account' => $localUser->identifiant]);
        $unknownResponse = $this->postJson('/api/auth/mot-de-passe-oublie', ['account' => 'unknown@example.test']);
        $ldapResponse = $this->postJson('/api/auth/mot-de-passe-oublie', ['account' => $ldapUser->email]);

        $localResponse->assertAccepted()->assertExactJson($unknownResponse->json());
        $ldapResponse->assertAccepted()->assertExactJson($unknownResponse->json());
        Notification::assertSentTo($localUser, ResetPassword::class);
        Notification::assertNotSentTo($ldapUser, ResetPassword::class);
    }

    public function test_password_reset_link_redirects_to_the_frontend_route(): void
    {
        $this->get('/password/reset/example-token?email=user%40example.test')
            ->assertRedirect('http://127.0.0.1:5173/reinitialisation/example-token?email=user%40example.test');
    }

    public function test_password_reset_link_sets_password_once_and_enforces_minimum_length(): void
    {
        Notification::fake();
        $user = User::factory()->create([
            'identifiant' => 'password.reset',
            'email' => 'password.reset@example.test',
            'auth_source' => 'local',
            'password' => null,
        ]);
        $this->postJson('/api/auth/mot-de-passe-oublie', ['account' => $user->email])->assertAccepted();
        $token = null;
        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use (&$token): bool {
            $token = $notification->token;

            return true;
        });

        $this->postJson('/api/auth/mot-de-passe', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'short',
            'password_confirmation' => 'short',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');

        foreach (['azerty123', 'Azertyuiop', 'Azer12'] as $weak) {
            $this->postJson('/api/auth/mot-de-passe', [
                'email' => $user->email,
                'token' => $token,
                'password' => $weak,
                'password_confirmation' => $weak,
            ])->assertUnprocessable()->assertJsonValidationErrors('password');
        }

        $this->postJson('/api/auth/mot-de-passe', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'Nouveau2026',
            'password_confirmation' => 'Nouveau2026',
        ])->assertOk();
        $this->assertTrue(Hash::check('Nouveau2026', $user->fresh()->password));

        $this->postJson('/api/auth/mot-de-passe', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'Autre2026x',
            'password_confirmation' => 'Autre2026x',
        ])->assertUnprocessable();
    }

    public function test_demo_seeder_creates_one_local_account_for_each_profile(): void
    {
        $this->seed();

        $demoIdentifiers = [
            'agent.demo',
            'pilote.demo',
            'valideur.demo',
            'controle.demo',
            'direction.demo',
            'admin-fonctionnel.demo',
            'admin-technique.demo',
        ];

        $this->assertSame(7, User::whereIn('identifiant', $demoIdentifiers)->count());
        $this->assertTrue(Hash::check(
            'Azerty123',
            User::where('identifiant', 'agent.demo')->value('password'),
        ));
    }

    /**
     * @return array{0: User, 1: Affectation}
     */
    private function createAssignedUser(string $roleCode, ?string $identifier = null): array
    {
        $user = User::factory()->create(['identifiant' => $identifier ?? 'test.'.Str::uuid()]);
        $role = Role::firstOrCreate(['code' => $roleCode], ['libelle' => $roleCode]);
        $unit = Unite::firstOrCreate(['code' => 'UNIT-'.Str::uuid()], ['libelle' => 'Unité de test']);
        $assignment = Affectation::create([
            'user_id' => $user->id,
            'role_id' => $role->id,
            'unite_id' => $unit->id,
            'actif' => true,
        ]);

        return [$user, $assignment];
    }
}
