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
     * Droits effectifs d'un rôle : ceux qu'il a d'office, plus ceux que l'administrateur lui a accordés.
     * Une ligne enregistrée pour un droit non réglable reste sans effet.
     *
     * @return list<string>
     */
    public static function pourRole(?Role $role): array
    {
        if ($role === null) {
            return [];
        }

        $accordes = self::query()->where('role_id', $role->id)->pluck('permission')->all();

        return collect(Permission::cases())
            ->filter(fn (Permission $permission) => match ($permission->etat($role->code)) {
                Permission::TOUJOURS => true,
                Permission::REGLABLE => in_array($permission->value, $accordes, true),
                default => false,
            })
            ->map(fn (Permission $permission) => $permission->value)
            ->values()
            ->all();
    }

    /**
     * Pré-remplit les droits réglables accordés par défaut, seulement si la table est vide :
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
