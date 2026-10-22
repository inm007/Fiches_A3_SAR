<?php

namespace Database\Seeders;

use App\Enums\Domaine;
use App\Enums\Permission;
use App\Models\DomaineRole;
use App\Models\Role;
use App\Models\RolePermission;
use Illuminate\Database\Seeder;

/**
 * Correspondance domaine → directeurs par défaut, posée une seule fois : l'administrateur
 * la modifie ensuite à l'écran. Donne aussi aux rôles ajoutés le 22/10/2026 leurs droits par défaut
 * sur une base déjà installée.
 */
class CircuitSeeder extends Seeder
{
    public function run(): void
    {
        $roles = Role::query()->pluck('id', 'code');

        if (! DomaineRole::query()->exists()) {
            foreach (Domaine::cases() as $domaine) {
                foreach ($domaine->rolesParDefaut() as $code) {
                    if ($roles->has($code)) {
                        DomaineRole::create(['domaine' => $domaine->value, 'role_id' => $roles[$code]]);
                    }
                }
            }
        }

        // Sur une base neuve, PermissionsSeeder pose tous les droits par défaut.
        if (! RolePermission::query()->exists()) {
            return;
        }
        foreach (Permission::cases() as $permission) {
            foreach (array_intersect($permission->rolesParDefaut(), ['CHEF_DEPARTEMENT', 'VALIDEUR_DSI']) as $code) {
                if ($roles->has($code)) {
                    RolePermission::firstOrCreate(['role_id' => $roles[$code], 'permission' => $permission->value]);
                }
            }
        }
    }
}
