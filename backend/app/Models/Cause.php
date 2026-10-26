<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cause extends Model
{
    protected $table = 'causes';

    protected $fillable = [
        'fiche_id',
        'numero',
        'categorie',
        'libelle',
        'niveau',
        'racine',
        'preuve',
    ];

    protected function casts(): array
    {
        return [
            'racine' => 'boolean',
        ];
    }

    public function actions(): HasMany
    {
        return $this->hasMany(ActionA3::class, 'cause_id');
    }

    public function fiche(): BelongsTo
    {
        return $this->belongsTo(FicheA3::class, 'fiche_id');
    }
}
