<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ValeurListe extends Model
{
    protected $table = 'valeurs_listes';

    protected function casts(): array
    {
        return [
            'ordre' => 'integer',
            'actif' => 'boolean',
        ];
    }

    protected $fillable = [
        'liste_id',
        'parent_id',
        'code',
        'libelle',
        'ordre',
        'actif',
        'cree_par_id',
    ];

    /** Codes de la valeur « Autre » selon les listes (« Autre » ou « Autres »). */
    public const array CODES_AUTRE = ['AUTRE', 'AUTRES'];

    /**
     * Valeurs d'une liste de choix, désignée par son code (origine, methode_analyse…).
     *
     * @param  Builder<ValeurListe>  $query
     */
    public function scopeDeLaListe(Builder $query, string $liste): void
    {
        $query->whereHas('liste', fn (Builder $q) => $q->where('code', $liste));
    }

    /**
     * Valeur « Autre » sous laquelle se range une option créée depuis une fiche.
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function liste(): BelongsTo
    {
        return $this->belongsTo(Liste::class, 'liste_id');
    }
}
