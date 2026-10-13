<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Cause extends Model
{
    protected $table = 'causes';

    protected $fillable = [
        'fiche_id',
        'numero',
        'methode',
        'categorie',
        'libelle',
        'niveau',
        'racine',
        'preuve',
    ];

    protected $casts = [
        'racine' => 'boolean',
    ];

    public function fiche(): BelongsTo
    {
        return $this->belongsTo(FicheA3::class, 'fiche_id');
    }
}
