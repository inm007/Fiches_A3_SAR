<?php

namespace App\Models;

use App\Enums\Permission;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RolePermission extends Model
{
    protected $table = 'role_permissions';

    protected $fillable = [
        'role_id',
        'permission',
    ];

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    /**
     * Droits effectifs d'un rôle : un droit non éligible enregistré à tort reste sans effet.
     *
     * @return list<string>
     */
    public static function pourRole(?Role $role): array
    {
        if ($role === null) {
            return [];
        }

        return self::query()
            ->where('role_id', $role->id)
            ->orderBy('permission')
            ->pluck('permission')
            ->filter(fn (string $code) => Permission::tryFrom($code)?->estEligible($role->code) ?? false)
            ->values()
            ->all();
    }

    /**
     * Pré-remplit la matrice du PRD §2.3, seulement si elle est vide :
     * un nouveau seed n'écrase jamais les choix de l'administrateur.
     */
    public static function initialiserParDefaut(): void
    {
        if (self::query()->exists()) {
            return;
        }

        $roles = Role::query()->pluck('id', 'code');
        foreach (Permission::cases() as $permission) {
            foreach ($permission->rolesParDefaut() as $code) {
                if ($roles->has($code)) {
                    self::create(['role_id' => $roles[$code], 'permission' => $permission->value]);
                }
            }
        }
    }
}
