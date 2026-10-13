<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReferenceSap extends Model
{
    protected $table = 'references_sap';

    protected $fillable = [
        'fiche_id',
        'equipement_id',
        'numero_avis',
        'numero_ordre',
        'libelle',
        'statut',
        'cout',
    ];

    public function fiche(): BelongsTo
    {
        return $this->belongsTo(FicheA3::class, 'fiche_id');
    }

    public function equipement(): BelongsTo
    {
        return $this->belongsTo(Equipement::class, 'equipement_id');
    }
}
