<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Organigramme : direction → département → service. Distinct des unités de
 * production (unites), qui portent le périmètre des fiches et des affectations.
 */
class Entite extends Model
{
    public const array TYPES = ['DIRECTION', 'DEPARTEMENT', 'SERVICE'];

    /**
     * Type de parent attendu pour chaque type d'entité.
     */
    public const array PARENT_ATTENDU = ['DIRECTION' => null, 'DEPARTEMENT' => 'DIRECTION', 'SERVICE' => 'DEPARTEMENT'];

    protected $table = 'entites';

    protected $fillable = [
        'code',
        'libelle',
        'type',
        'parent_id',
        'responsable_id',
        'actif',
    ];

    protected function casts(): array
    {
        return [
            'actif' => 'boolean',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function enfants(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function responsable(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsable_id');
    }

    public function membres(): HasMany
    {
        return $this->hasMany(User::class, 'entite_id');
    }

    /**
     * Premier ancêtre (ou l'entité elle-même) du type demandé.
     */
    public function ancetre(string $type): ?self
    {
        $entite = $this;
        for ($profondeur = 0; $entite !== null && $profondeur < 10; $profondeur++) {
            if ($entite->type === $type) {
                return $entite;
            }
            $entite = $entite->parent;
        }

        return null;
    }
}
