<?php

namespace Tests\Feature;

use App\Models\Affectation;
use App\Models\Entite;
use App\Models\FicheA3;
use App\Models\Liste;
use App\Models\Role;
use App\Models\Unite;
use App\Models\User;
use App\Models\ValeurListe;
use Database\Seeders\ReferenceListsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAdministrationTest extends TestCase
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

    public function test_active_assignment_role_is_required_to_access_administration(): void
    {
        [$admin, $adminRole] = $this->userWithRole('ADMIN_FONCTIONNEL');
        [$other] = $this->userWithRole('PILOTE');
        $activeAdminAssignment = Affectation::create([
            'user_id' => $admin->id,
            'role_id' => $adminRole->id,
            'unite_id' => null,
        ]);

        $this->withSession(['auth.active_assignment_id' => $activeAdminAssignment->id])
            ->actingAs($other)
            ->getJson('/api/admin/users')
            ->assertForbidden()
            ->assertJsonPath('message', 'Accès réservé à l’administrateur fonctionnel du profil actif.');

    }

    public function test_an_admin_role_on_another_assignment_does_not_grant_access(): void
    {
        [$admin, $adminRole] = $this->userWithRole('ADMIN_FONCTIONNEL');
        $activeAssignment = Affectation::create([
            'user_id' => $admin->id,
            'role_id' => $adminRole->id,
            'unite_id' => null,
            'actif' => false,
        ]);

        $this->actingAs($admin)
            ->withSession(['auth.active_assignment_id' => $activeAssignment->id])
            ->getJson('/api/admin/users')
            ->assertForbidden();
    }

    public function test_admin_can_manage_users_and_audit_without_returning_password_data(): void
    {
        [$admin] = $this->asAdmin();

        $this->postJson('/api/admin/users', [
            'identifiant' => 'agent.1',
            'nom' => 'Ndiaye',
            'prenom' => 'Awa',
            'email' => 'awa@example.test',
        ])
            ->assertCreated()
            ->assertJsonPath('data.identifiant', 'agent.1')
            ->assertJsonMissingPath('data.password');

        $user = User::where('identifiant', 'agent.1')->firstOrFail();
        $this->assertNull($user->password);

        $this->patchJson('/api/admin/users/'.$user->id, ['actif' => false])
            ->assertOk()
            ->assertJsonPath('data.actif', false);

        $this->assertDatabaseHas('journal_administration', [
            'auteur_id' => $admin->id,
            'operation' => 'CREATION',
            'objet' => 'user:'.$user->id,
        ]);
        $this->assertDatabaseHas('journal_administration', [
            'auteur_id' => $admin->id,
            'operation' => 'MODIFICATION',
            'objet' => 'user:'.$user->id,
        ]);
    }

    public function test_user_authentication_source_changes_require_a_matching_ldap_dn_and_clear_passwords(): void
    {
        $this->asAdmin();
        $user = User::create([
            'identifiant' => 'local.user',
            'nom' => 'Local',
            'prenom' => 'User',
            'email' => 'local@example.test',
            'password' => 'initial-password',
            'auth_source' => 'local',
            'actif' => true,
        ]);

        $this->patchJson('/api/admin/users/'.$user->id, ['auth_source' => 'ldap'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('ldap_dn');

        $this->patchJson('/api/admin/users/'.$user->id, [
            'auth_source' => 'ldap',
            'ldap_dn' => 'uid=local.user,ou=users,dc=sar,dc=local',
        ])->assertOk()
            ->assertJsonPath('data.auth_source', 'ldap');
        $this->assertDatabaseHas('users', ['id' => $user->id, 'password' => null]);

        $this->patchJson('/api/admin/users/'.$user->id, [
            'auth_source' => 'local',
            'ldap_dn' => null,
        ])->assertOk()
            ->assertJsonPath('data.auth_source', 'local');
    }

    public function test_roles_are_read_only_and_have_frontend_payload_shape(): void
    {
        $this->asAdmin();
        $role = Role::where('code', 'DIRECTION')->firstOrFail();

        $this->getJson('/api/admin/roles')
            ->assertOk()
            ->assertJsonFragment(['id' => $role->id, 'code' => 'DIRECTION', 'libelle' => 'Direction']);
        $this->assertSame(['id', 'code', 'libelle', 'par_unite'], array_keys($this->getJson('/api/admin/roles')->json('data.0')));
        $roles = collect($this->getJson('/api/admin/roles')->json('data'))->keyBy('code');
        $this->assertTrue($roles['PILOTE']['par_unite']);
        $this->assertFalse($roles['DIRECTION']['par_unite']);
    }

    public function test_reference_list_seeder_is_complete_and_idempotent(): void
    {
        $listCodes = [
            'type_amelioration',
            'origine',
            'frequence',
            'methode_analyse',
            'categorie_cause',
            'type_action',
            'categorie_gain',
            'type_perennisation',
        ];

        $this->seed(ReferenceListsSeeder::class);
        $this->seed(ReferenceListsSeeder::class);

        $listIds = Liste::query()->whereIn('code', $listCodes)->select('id');
        $this->assertSame(8, Liste::query()->whereIn('code', $listCodes)->count());
        $this->assertSame(44, ValeurListe::query()->whereIn('liste_id', $listIds)->count());
        $this->assertDatabaseMissing('listes', ['code' => 'domaine']);
        $this->assertDatabaseHas('listes', ['code' => 'type_action']);
        $this->assertDatabaseMissing('listes', ['code' => 'frequence_controle']);
        $this->assertDatabaseHas('valeurs_listes', [
            'code' => 'INCIDENT_PRESQUE_ACCIDENT',
            'libelle' => 'Incident/presque-accident',
        ]);
    }

    public function test_assignment_role_and_unit_scope_are_validated(): void
    {
        $this->asAdmin();
        $agentRole = Role::where('code', 'AGENT')->firstOrFail();
        $globalRole = Role::where('code', 'DIRECTION')->firstOrFail();
        $unit = Unite::create(['code' => 'U1', 'libelle' => 'Unité 1']);
        $user = User::create([
            'identifiant' => 'agent.1',
            'nom' => 'Ndiaye',
            'prenom' => 'Awa',
            'email' => 'awa@example.test',
            'actif' => true,
        ]);

        $this->postJson('/api/admin/assignments', [
            'user_id' => $user->id,
            'role_id' => $agentRole->id,
            'unite_id' => null,
        ])->assertUnprocessable()->assertJsonValidationErrors('unite_id');

        $this->postJson('/api/admin/assignments', [
            'user_id' => $user->id,
            'role_id' => $globalRole->id,
            'unite_id' => $unit->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('unite_id');

        $this->postJson('/api/admin/assignments', [
            'user_id' => $user->id,
            'role_id' => $agentRole->id,
            'unite_id' => $unit->id,
        ])->assertCreated()
            ->assertJsonPath('data.user.id', $user->id)
            ->assertJsonPath('data.role.code', 'AGENT')
            ->assertJsonPath('data.unite.code', 'U1');
    }

    public function test_assignments_units_equipment_and_list_values_can_be_updated_without_deletion(): void
    {
        $this->asAdmin();
        $unitRole = Role::where('code', 'AGENT')->firstOrFail();
        $unit = Unite::create(['code' => 'U1', 'libelle' => 'Unité 1']);
        $user = User::create([
            'identifiant' => 'agent.1',
            'nom' => 'Ndiaye',
            'prenom' => 'Awa',
            'email' => 'awa@example.test',
            'actif' => true,
        ]);

        $assignment = $this->postJson('/api/admin/assignments', [
            'user_id' => $user->id,
            'role_id' => $unitRole->id,
            'unite_id' => $unit->id,
        ])->assertCreated()->json('data');
        $this->patchJson('/api/admin/assignments/'.$assignment['id'], ['actif' => false])
            ->assertOk()
            ->assertJsonPath('data.actif', false);

        $equipment = $this->postJson('/api/admin/equipment', [
            'code' => 'EQ-1',
            'libelle' => 'Pompe',
            'unite_id' => $unit->id,
        ])->assertCreated()->json('data');
        $this->patchJson('/api/admin/equipment/'.$equipment['id'], ['actif' => false])
            ->assertOk()
            ->assertJsonPath('data.actif', false);

        $list = Liste::create(['code' => 'ORIGINE', 'libelle' => 'Origine']);
        $value = $this->postJson("/api/admin/lists/{$list->id}/values", [
            'code' => 'SAP',
            'libelle' => 'SAP',
        ])->assertCreated()
            ->assertJsonPath('data.ordre', 1)
            ->json('data');
        $lists = $this->getJson('/api/admin/lists')->assertOk()->json('data');
        $listedValues = collect($lists)->firstWhere('id', $list->id)['valeurs'];
        $this->assertSame(1, $listedValues[0]['ordre']);
        $this->assertSame($value['id'], $listedValues[0]['id']);

        $this->patchJson('/api/admin/units/'.$unit->id, ['actif' => false])
            ->assertOk()
            ->assertJsonPath('data.actif', false);

        $this->assertDatabaseHas('affectations', ['id' => $assignment['id'], 'actif' => false]);
        $this->assertDatabaseHas('equipements', ['id' => $equipment['id'], 'actif' => false]);
        $this->assertDatabaseHas('unites', ['id' => $unit->id, 'actif' => false]);
    }

    public function test_values_are_returned_in_order_and_can_be_reordered_with_patch(): void
    {
        $this->asAdmin();
        $list = Liste::create(['code' => 'ORIGINE', 'libelle' => 'Origine']);
        $first = $list->valeurs()->create(['code' => 'A', 'libelle' => 'A', 'ordre' => 1]);
        $second = $list->valeurs()->create(['code' => 'B', 'libelle' => 'B', 'ordre' => 2]);

        $this->patchJson("/api/admin/lists/{$list->id}/values/{$second->id}", ['ordre' => 0])
            ->assertOk()
            ->assertJsonPath('data.ordre', 0);
        $this->getJson("/api/admin/lists/{$list->id}/values")
            ->assertOk()
            ->assertJsonPath('data.0.id', $second->id)
            ->assertJsonPath('data.0.ordre', 0)
            ->assertJsonPath('data.1.id', $first->id);

        $this->patchJson("/api/admin/lists/{$list->id}/values/{$first->id}", ['actif' => false])
            ->assertOk()
            ->assertJsonPath('data.actif', false);
    }

    public function test_admin_can_consult_fiches_and_only_change_the_pilot_or_confidentiality(): void
    {
        [$admin] = $this->asAdmin();
        $unit = Unite::create(['code' => 'U1', 'libelle' => 'Unité 1']);
        [$pilot, $pilotRole] = $this->userWithRole('PILOTE');
        Affectation::create([
            'user_id' => $pilot->id,
            'role_id' => $pilotRole->id,
            'unite_id' => $unit->id,
        ]);
        $fiche = FicheA3::create([
            'numero_a3' => 'A3-1999-001',
            'titre' => 'Réduire les pertes',
            'enonce_probleme' => 'Constat de test',
            'unite_id' => $unit->id,
            'declarant_id' => $admin->id,
        ]);

        $this->getJson('/api/admin/fiches')
            ->assertOk()
            ->assertJsonPath('data.0.numero_a3', 'A3-1999-001')
            ->assertJsonPath('data.0.confidentialite', 'NORMAL');

        $this->patchJson('/api/admin/fiches/'.$fiche->id, [
            'pilote_id' => $pilot->id,
            'confidentialite' => 'RESTREINT',
            'titre' => 'Tentative de modification métier',
        ])->assertOk()
            ->assertJsonPath('data.pilote.id', $pilot->id)
            ->assertJsonPath('data.confidentialite', 'RESTREINT');

        $this->assertDatabaseHas('fiches_a3', [
            'id' => $fiche->id,
            'titre' => 'Réduire les pertes',
            'pilote_id' => $pilot->id,
            'confidentialite' => 'RESTREINT',
        ]);
        $this->assertDatabaseHas('journal_administration', [
            'auteur_id' => $admin->id,
            'operation' => 'MODIFICATION_ADMIN_FONCTIONNELLE',
            'objet' => 'fiche_a3:'.$fiche->id,
        ]);
    }

    public function test_admin_cannot_assign_a_pilot_outside_the_fiche_unit_at_any_stage(): void
    {
        $this->asAdmin();
        $unit = Unite::create(['code' => 'U1', 'libelle' => 'Unité 1']);
        [$pilot, $pilotRole] = $this->userWithRole('PILOTE');
        Affectation::create([
            'user_id' => $pilot->id,
            'role_id' => $pilotRole->id,
            'unite_id' => Unite::create(['code' => 'U2', 'libelle' => 'Unité 2'])->id,
        ]);
        $declarant = User::create([
            'identifiant' => 'declarant.test',
            'nom' => 'Déclarant',
            'prenom' => 'Test',
            'email' => 'declarant@example.test',
            'actif' => true,
        ]);
        $fiche = FicheA3::create([
            'numero_a3' => 'A3-1999-002',
            'titre' => 'Fiche test',
            'enonce_probleme' => 'Constat',
            'unite_id' => $unit->id,
            'declarant_id' => $declarant->id,
        ]);

        $this->patchJson('/api/admin/fiches/'.$fiche->id, ['pilote_id' => $pilot->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('pilote_id');

        $fiche->update(['statut_etape' => 'EN_COURS']);
        $this->patchJson('/api/admin/fiches/'.$fiche->id, ['pilote_id' => $pilot->id, 'motif' => 'Mutation'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('pilote_id');
    }

    public function test_value_order_is_updated_atomically_from_the_complete_list_order(): void
    {
        $this->asAdmin();
        $list = Liste::create(['code' => 'ORIGINE', 'libelle' => 'Origine']);
        $first = $list->valeurs()->create(['code' => 'A', 'libelle' => 'A', 'ordre' => 1]);
        $second = $list->valeurs()->create(['code' => 'B', 'libelle' => 'B', 'ordre' => 1]);
        $third = $list->valeurs()->create(['code' => 'C', 'libelle' => 'C', 'ordre' => 2]);

        $this->putJson("/api/admin/lists/{$list->id}/values/order", [
            'ids' => [$third->id, $first->id, $second->id],
        ])->assertOk()
            ->assertJsonPath('data.0.id', $third->id)
            ->assertJsonPath('data.0.ordre', 1)
            ->assertJsonPath('data.1.id', $first->id)
            ->assertJsonPath('data.1.ordre', 2)
            ->assertJsonPath('data.2.id', $second->id)
            ->assertJsonPath('data.2.ordre', 3);

        $this->putJson("/api/admin/lists/{$list->id}/values/order", [
            'ids' => [$third->id, $first->id],
        ])->assertUnprocessable()->assertJsonValidationErrors('ids');
    }

    public function test_settings_have_defaults_and_reject_non_positive_values(): void
    {
        $this->asAdmin();
        $this->getJson('/api/admin/settings')
            ->assertOk()
            ->assertJsonPath('data.reminder_interval_days', 7)
            ->assertJsonPath('data.validation_reminders_enabled', true)
            ->assertJsonPath('data.attachment_max_size_mb', 10)
            ->assertJsonPath('data.attachment_max_files', 20);

        $this->putJson('/api/admin/settings', [
            'reminder_interval_days' => 0,
            'validation_reminders_enabled' => true,
            'attachment_max_size_mb' => 10,
            'attachment_max_files' => 20,
        ])->assertUnprocessable()->assertJsonValidationErrors('reminder_interval_days');

        $this->putJson('/api/admin/settings', [
            'reminder_interval_days' => 14,
            'validation_reminders_enabled' => false,
            'due_soon_days' => 5,
            'attachment_max_size_mb' => 15,
            'attachment_max_files' => 3,
        ])->assertOk()
            ->assertJsonPath('data.reminder_interval_days', 14)
            ->assertJsonPath('data.validation_reminders_enabled', false)
            ->assertJsonPath('data.due_soon_days', 5);
    }

    public function test_password_link_uses_local_password_broker_only(): void
    {
        $this->asAdmin();
        $localUser = User::create([
            'identifiant' => 'local.user',
            'nom' => 'Local',
            'prenom' => 'User',
            'email' => 'local@example.test',
            'auth_source' => 'local',
            'actif' => true,
        ]);
        $ldapUser = User::create([
            'identifiant' => 'ldap.user',
            'nom' => 'LDAP',
            'prenom' => 'User',
            'email' => 'ldap@example.test',
            'auth_source' => 'ldap',
            'actif' => true,
        ]);

        $this->postJson('/api/admin/users/'.$localUser->id.'/password-link')
            ->assertOk()
            ->assertJsonPath('data.message', 'Le lien de réinitialisation a été envoyé.');
        $this->postJson('/api/admin/users/'.$ldapUser->id.'/password-link')
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Un lien ne peut être envoyé qu’à un compte local.');
    }

    /**
     * Tout ce que l'administrateur fonctionnel crée depuis ses écrans est relu depuis la base,
     * avec exactement les champs que les formulaires envoient (champ vide → null).
     */
    public function test_everything_the_admin_creates_from_the_screens_is_persisted(): void
    {
        $this->asAdmin();

        $unite = $this->postJson('/api/admin/units', ['code' => 'DA', 'libelle' => 'Distillation atmosphérique'])->assertCreated()->json('data');
        $this->assertDatabaseHas('unites', ['id' => $unite['id'], 'code' => 'DA', 'libelle' => 'Distillation atmosphérique', 'actif' => true]);

        $equipement = $this->postJson('/api/admin/equipment', ['unite_id' => (string) $unite['id'], 'code' => 'P-204', 'libelle' => 'Pompe de charge', 'reference_sap' => null])->assertCreated()->json('data');
        $this->assertDatabaseHas('equipements', ['id' => $equipement['id'], 'unite_id' => $unite['id'], 'code' => 'P-204', 'reference_sap' => null]);

        $direction = $this->postJson('/api/admin/entities', ['type' => 'DIRECTION', 'code' => 'DPROD', 'libelle' => 'Direction Production', 'parent_id' => null, 'responsable_id' => null])->assertCreated()->json('data');
        $departement = $this->postJson('/api/admin/entities', ['type' => 'DEPARTEMENT', 'code' => 'DFAB', 'libelle' => 'Fabrication', 'parent_id' => (string) $direction['id'], 'responsable_id' => null])->assertCreated()->json('data');
        $this->assertDatabaseHas('entites', ['id' => $departement['id'], 'type' => 'DEPARTEMENT', 'parent_id' => $direction['id']]);

        $user = $this->postJson('/api/admin/users', [
            'identifiant' => 'awa.ndiaye', 'email' => 'awa.ndiaye@example.test', 'nom' => 'Ndiaye', 'prenom' => 'Awa',
            'auth_source' => 'local', 'entite_id' => (string) $departement['id'],
        ])->assertCreated()->json('data');
        $this->assertDatabaseHas('users', ['id' => $user['id'], 'identifiant' => 'awa.ndiaye', 'entite_id' => $departement['id'], 'auth_source' => 'local', 'actif' => true]);

        $role = Role::where('code', 'AGENT')->firstOrFail();
        $affectation = $this->postJson('/api/admin/assignments', [
            'user_id' => (string) $user['id'], 'role_id' => (string) $role->id, 'unite_id' => (string) $unite['id'], 'date_debut' => null, 'date_fin' => now()->addMonth()->toDateString(),
        ])->assertCreated()->json('data');
        $this->assertDatabaseHas('affectations', ['id' => $affectation['id'], 'user_id' => $user['id'], 'role_id' => $role->id, 'unite_id' => $unite['id'], 'actif' => true]);
        $this->assertNotNull(Affectation::findOrFail($affectation['id'])->date_fin);

        $liste = Liste::query()->firstOrFail();
        $valeur = $this->postJson("/api/admin/lists/{$liste->id}/values", ['code' => 'NOUVELLE_VALEUR', 'libelle' => 'Nouvelle valeur', 'ordre' => 99])->assertCreated()->json('data');
        $this->assertDatabaseHas('valeurs_listes', ['id' => $valeur['id'], 'liste_id' => $liste->id, 'libelle' => 'Nouvelle valeur', 'ordre' => 99]);

        $reglages = ['reminder_interval_days' => 5, 'validation_reminders_enabled' => false, 'due_soon_days' => 4, 'attachment_max_size_mb' => 12, 'attachment_max_files' => 15];
        $this->putJson('/api/admin/settings', $reglages)->assertOk();
        foreach ($reglages as $cle => $valeurAttendue) {
            $this->assertEquals($valeurAttendue, $this->getJson('/api/admin/settings')->json("data.{$cle}"));
        }

        $circuit = $this->getJson('/api/admin/circuit')->assertOk()->json('data');
        $ligne = collect($circuit['domaines'])->first(fn (array $domaine) => ! $domaine['choisi_sur_la_fiche']);
        $directeur = $circuit['directeurs'][0]['code'];
        $domaines = collect($circuit['domaines'])->map(fn (array $domaine) => [
            'domaine' => $domaine['domaine'],
            'roles' => $domaine['domaine'] === $ligne['domaine'] ? [$directeur] : $domaine['roles'],
        ])->all();
        $this->putJson('/api/admin/circuit', ['domaines' => $domaines])->assertOk();
        $relu = collect($this->getJson('/api/admin/circuit')->json('data.domaines'))->firstWhere('domaine', $ligne['domaine']);
        $this->assertSame([$directeur], $relu['roles']);

        $matrice = $this->getJson('/api/admin/permissions')->assertOk()->json('data');
        [$permission, $roleId, $cellule] = collect($matrice['permissions'])
            ->flatMap(fn (array $p) => collect($p['roles'])->map(fn (array $c, $id) => [$p['code'], (int) $id, $c]))
            ->first(fn (array $triple) => $triple[2]['etat'] === 'REGLABLE');
        $this->putJson('/api/admin/permissions', ['role_id' => $roleId, 'permission' => $permission, 'accorde' => ! $cellule['accorde']])->assertOk();
        $relue = collect($this->getJson('/api/admin/permissions')->json('data.permissions'))->firstWhere('code', $permission);
        $this->assertSame(! $cellule['accorde'], $relue['roles'][$roleId]['accorde']);
    }

    public function test_directory_search_lists_people_and_flags_existing_accounts(): void
    {
        $this->asAdmin();

        $this->getJson('/api/admin/annuaire?q=ndao')
            ->assertOk()
            ->assertJsonPath('meta.source', 'demo')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.identifiant', 'modou.ndao')
            ->assertJsonPath('data.0.ldap_dn', 'uid=modou.ndao,ou=personnel,dc=sar,dc=sn')
            ->assertJsonPath('data.0.compte_id', null);
        // Recherche sans accent : « Marème » est trouvée par « mareme ».
        $this->getJson('/api/admin/annuaire?q=mareme')->assertOk()->assertJsonPath('data.0.prenom', 'Marème');

        $user = User::create([
            'identifiant' => 'modou.ndao', 'nom' => 'Ndao', 'prenom' => 'Modou', 'email' => 'modou.ndao@sar.sn',
            'auth_source' => 'ldap', 'ldap_dn' => 'uid=modou.ndao,ou=personnel,dc=sar,dc=sn', 'actif' => true,
        ]);
        $this->getJson('/api/admin/annuaire?q=ndao')->assertOk()->assertJsonPath('data.0.compte_id', $user->id);
    }

    public function test_the_creation_wizard_creates_the_account_its_role_and_its_responsibility_at_once(): void
    {
        $this->asAdmin();
        $unite = Unite::create(['code' => 'DA', 'libelle' => 'Distillation atmosphérique', 'actif' => true]);
        $direction = Entite::create(['code' => 'DPROD', 'libelle' => 'Direction Production', 'type' => 'DIRECTION', 'actif' => true]);
        $departement = Entite::create(['code' => 'DFAB', 'libelle' => 'Fabrication', 'type' => 'DEPARTEMENT', 'parent_id' => $direction->id, 'actif' => true]);
        $pilote = Role::where('code', 'PILOTE')->firstOrFail();

        $data = $this->postJson('/api/admin/users', [
            'auth_source' => 'ldap', 'ldap_dn' => 'uid=yacine.wade,ou=personnel,dc=sar,dc=sn',
            'identifiant' => 'yacine.wade', 'nom' => 'Wade', 'prenom' => 'Yacine', 'email' => 'yacine.wade@sar.sn',
            'role_id' => (string) $pilote->id, 'unite_id' => (string) $unite->id,
            'entite_id' => (string) $departement->id, 'responsable_entite_id' => (string) $departement->id,
        ])->assertCreated()
            ->assertJsonPath('data.lien_envoye', false)
            ->json('data');

        $this->assertDatabaseHas('users', ['id' => $data['id'], 'auth_source' => 'ldap', 'entite_id' => $departement->id, 'password' => null]);
        $this->assertDatabaseHas('affectations', ['user_id' => $data['id'], 'role_id' => $pilote->id, 'unite_id' => $unite->id, 'actif' => true]);
        $this->assertDatabaseHas('entites', ['id' => $departement->id, 'responsable_id' => $data['id']]);
        // Responsable d'un département : le profil Chef de département lui est donné par l'organigramme.
        $this->assertEqualsCanonicalizing(['PILOTE', 'CHEF_DEPARTEMENT'], collect($data['affectations'])->pluck('role.code')->all());
        $this->assertDatabaseHas('journal_administration', ['objet' => 'entite:'.$departement->id, 'operation' => 'MODIFICATION']);
    }

    public function test_the_creation_wizard_checks_the_role_scope_before_creating_anything(): void
    {
        $this->asAdmin();
        $unite = Unite::create(['code' => 'DA', 'libelle' => 'Distillation atmosphérique', 'actif' => true]);
        $compte = ['identifiant' => 'ousmane.ba', 'nom' => 'Ba', 'prenom' => 'Ousmane', 'email' => 'ousmane.ba@example.test'];
        $role = fn (string $code) => (string) Role::where('code', $code)->value('id');

        $this->postJson('/api/admin/users', [...$compte, 'role_id' => $role('PILOTE')])->assertUnprocessable()->assertJsonValidationErrors('unite_id');
        $this->postJson('/api/admin/users', [...$compte, 'role_id' => $role('DIRECTION'), 'unite_id' => (string) $unite->id])->assertUnprocessable()->assertJsonValidationErrors('unite_id');
        $this->postJson('/api/admin/users', [...$compte, 'role_id' => $role('CHEF_DEPARTEMENT')])->assertUnprocessable()->assertJsonValidationErrors('role_id');
        $this->postJson('/api/admin/users', [...$compte, 'unite_id' => (string) $unite->id])->assertUnprocessable()->assertJsonValidationErrors('role_id');
        $this->assertDatabaseMissing('users', ['identifiant' => 'ousmane.ba']);

        $this->postJson('/api/admin/users', [...$compte, 'role_id' => $role('DIRECTION')])->assertCreated();
        $this->assertSame(1, User::where('identifiant', 'ousmane.ba')->firstOrFail()->affectations()->count());
    }

    private function asAdmin(): array
    {
        [$user, $role] = $this->userWithRole('ADMIN_FONCTIONNEL');
        $assignment = Affectation::create([
            'user_id' => $user->id,
            'role_id' => $role->id,
            'unite_id' => null,
        ]);

        $this->actingAs($user)->withSession(['auth.active_assignment_id' => $assignment->id]);

        return [$user, $role];
    }

    private function userWithRole(string $roleCode): array
    {
        $role = Role::where('code', $roleCode)->firstOrFail();
        $user = User::create([
            'identifiant' => strtolower($roleCode).'.test',
            'nom' => 'Test',
            'prenom' => 'Admin',
            'email' => strtolower($roleCode).'@example.test',
            'password' => 'test-password',
            'actif' => true,
        ]);

        return [$user, $role];
    }
}
