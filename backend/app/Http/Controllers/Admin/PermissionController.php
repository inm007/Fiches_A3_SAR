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
 * Écran Droits : l'administrateur fonctionnel accorde ou retire un droit à un rôle.
 * Seuls les droits de l'énumération Permission sont réglables, et seulement pour leurs rôles éligibles.
 */
class PermissionController extends AdminController
{
    public function index(): JsonResponse
    {
        $roles = Role::query()->orderBy('id')->get(['id', 'code', 'libelle']);
        $accordes = RolePermission::query()->get(['role_id', 'permission'])
            ->groupBy('permission')
            ->map(fn ($lignes) => $lignes->pluck('role_id')->all());

        return response()->json(['data' => [
            'roles' => $roles,
            'permissions' => collect(Permission::cases())->map(fn (Permission $permission) => [
                'code' => $permission->value,
                'libelle' => $permission->libelle(),
                'description' => $permission->description(),
                'roles_eligibles' => $roles->whereIn('code', $permission->rolesEligibles())->pluck('id')->values(),
                'roles_par_defaut' => $roles->whereIn('code', $permission->rolesParDefaut())->pluck('id')->values(),
                'roles_accordes' => $roles->whereIn('id', $accordes->get($permission->value, []))->pluck('id')->values(),
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

        if (! $permission->estEligible($role->code)) {
            throw ValidationException::withMessages(['role_id' => 'Ce droit ne peut pas être accordé au rôle « '.$role->libelle.' ».']);
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
