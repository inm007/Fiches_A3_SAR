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
        'code',
        'libelle',
        'ordre',
        'actif',
    ];

    /**
     * Valeurs d'une liste de choix, désignée par son code (origine, methode_analyse…).
     *
     * @param  Builder<ValeurListe>  $query
     */
    public function scopeDeLaListe(Builder $query, string $liste): void
    {
        $query->whereHas('liste', fn (Builder $q) => $q->where('code', $liste));
    }

    public function liste(): BelongsTo
    {
        return $this->belongsTo(Liste::class, 'liste_id');
    }
}
