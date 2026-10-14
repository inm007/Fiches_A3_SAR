<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Equipement extends Model
{
    protected $table = 'equipements';

    protected $casts = [
        'actif' => 'boolean',
    ];

    protected $fillable = [
        'code',
        'libelle',
        'reference_sap',
        'unite_id',
        'actif',
    ];

    public function unite(): BelongsTo
    {
        return $this->belongsTo(Unite::class, 'unite_id');
    }

    public function fiches(): HasMany
    {
        return $this->hasMany(FicheA3::class, 'equipement_id');
    }
}
