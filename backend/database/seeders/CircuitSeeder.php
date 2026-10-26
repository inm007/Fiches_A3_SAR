<?php

namespace Database\Seeders;

use App\Enums\Domaine;
use App\Models\DomaineRole;
use App\Models\Role;
use Illuminate\Database\Seeder;

/**
 * Correspondance domaine → directeurs par défaut, posée une seule fois : l'administrateur
 * la modifie ensuite à l'écran.
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
    }
}
