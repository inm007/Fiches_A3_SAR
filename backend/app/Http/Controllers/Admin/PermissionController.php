<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Permission;
use App\Models\Role;
use App\Models\RolePermission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Écran Droits des rôles : l'administrateur fonctionnel accorde ou retire un droit réglable à un rôle.
 * Les droits accordés d'office, ceux du pilote sur ses fiches et les cases sans objet ne se modifient pas.
 */
class PermissionController extends AdminController
{
    public function index(): JsonResponse
    {
        // L'administrateur technique n'a aucun droit sur les fiches : il n'apparaît pas dans le tableau.
        $roles = Role::query()->where('code', '!=', 'ADMIN_TECHNIQUE')->orderBy('id')->get(['id', 'code', 'libelle', 'description']);
        $accordes = RolePermission::query()->get(['role_id', 'permission'])
            ->groupBy('permission')
            ->map(fn ($lignes) => $lignes->pluck('role_id')->all());

        return response()->json(['data' => [
            'roles' => $roles,
            'permissions' => collect(Permission::cases())->map(fn (Permission $permission) => [
                'code' => $permission->value,
                'libelle' => $permission->libelle(),
                'description' => $permission->description(),
                'roles' => $roles->mapWithKeys(function (Role $role) use ($permission, $accordes): array {
                    $etat = $permission->etat($role->code);

                    return [$role->id => [
                        'etat' => $etat,
                        'accorde' => match ($etat) {
                            Permission::TOUJOURS, Permission::SUR_SES_FICHES => true,
                            Permission::REGLABLE => in_array($role->id, $accordes->get($permission->value, []), true),
                            default => false,
                        },
                    ]];
                }),
            ]),
        ]]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'role_id' => ['required', 'integer', 'exists:roles,id'],
            'permission' => ['required', Rule::enum(Permission::class)],
            'accorde' => ['required', 'boolean'],
        ]);
        $role = Role::query()->findOrFail($validated['role_id']);
        $permission = Permission::from($validated['permission']);

        if (! $permission->estReglable($role->code)) {
            throw ValidationException::withMessages(['role_id' => 'Le droit « '.$permission->libelle().' » n’est pas modifiable pour le rôle « '.$role->libelle.' ».']);
        }

        DB::transaction(function () use ($request, $role, $permission, $validated): void {
            $existant = RolePermission::query()->where('role_id', $role->id)->where('permission', $permission->value)->first();
            if ($validated['accorde'] && $existant === null) {
                RolePermission::create(['role_id' => $role->id, 'permission' => $permission->value]);
            } elseif (! $validated['accorde'] && $existant !== null) {
                $existant->delete();
            } else {
                return;
            }

            $this->audit($request, $validated['accorde'] ? 'ACCORD_DROIT' : 'RETRAIT_DROIT', 'role', $role->id, [
                'role' => $role->code,
                'permission' => $permission->value,
            ]);
        });

        return $this->index();
    }
}
