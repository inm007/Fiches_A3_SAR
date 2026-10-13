<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Gain extends Model
{
    protected $table = 'gains';

    protected $fillable = [
        'fiche_id',
        'categorie',
        'hypothese_calcul',
        'quantite',
        'unite',
        'cout_unitaire',
        'statut',
        'valide_par_id',
        'date_validation',
    ];

    protected $casts = [
        'quantite' => 'decimal:4',
        'date_validation' => 'datetime',
        'cout_unitaire' => 'integer',
    ];

    public function fiche(): BelongsTo
    {
        return $this->belongsTo(FicheA3::class, 'fiche_id');
    }

    public function validePar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'valide_par_id');
    }
}
