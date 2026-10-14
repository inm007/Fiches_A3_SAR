<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ValeurListe extends Model
{
    protected $table = 'valeurs_listes';

    protected $casts = [
        'ordre' => 'integer',
        'actif' => 'boolean',
    ];

    protected $fillable = [
        'liste_id',
        'code',
        'libelle',
        'ordre',
        'actif',
    ];

    public function liste(): BelongsTo
    {
        return $this->belongsTo(Liste::class, 'liste_id');
    }
}
