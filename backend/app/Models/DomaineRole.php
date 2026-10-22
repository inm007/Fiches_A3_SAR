<?php

namespace App\Models;

use App\Enums\Domaine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Correspondance domaine coché → directeurs sollicités à la porte 1, réglée par
 * l'administrateur fonctionnel (écran Circuit de validation).
 */
class DomaineRole extends Model
{
    protected $table = 'domaine_roles';

    protected $fillable = [
        'domaine',
        'role_id',
    ];

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    /**
     * Codes des rôles sollicités pour chaque domaine.
     *
     * @return array<string, array<int, string>>
     */
    public static function correspondance(): array
    {
        $lignes = self::query()->join('roles', 'roles.id', '=', 'domaine_roles.role_id')
            ->orderBy('roles.id')
            ->get(['domaine_roles.domaine', 'roles.code']);

        return collect(Domaine::cases())
            ->mapWithKeys(fn (Domaine $domaine) => [$domaine->value => $lignes->where('domaine', $domaine->value)->pluck('code')->values()->all()])
            ->all();
    }

    /**
     * Domaines pour lesquels le rôle est sollicité.
     *
     * @return array<int, string>
     */
    public static function domainesDuRole(string $roleCode): array
    {
        return collect(self::correspondance())
            ->filter(fn (array $codes) => in_array($roleCode, $codes, true))
            ->keys()
            ->all();
    }
}
