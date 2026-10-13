<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FicheA3Indicateur extends Model
{
    protected $table = 'indicateurs';

    protected $fillable = [
        'fiche_id',
        'libelle',
        'unite_mesure',
        'sens',
        'principal',
        'a_ne_pas_degrader',
        'source',
        'periode',
    ];

    protected $casts = [
        'principal' => 'boolean',
        'a_ne_pas_degrader' => 'boolean',
    ];

    public function fiche(): BelongsTo
    {
        return $this->belongsTo(FicheA3::class, 'fiche_id');
    }

    public function mesures(): HasMany
    {
        return $this->hasMany(FicheA3Mesure::class, 'indicateur_id');
    }
}
