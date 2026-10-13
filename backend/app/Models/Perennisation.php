<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Perennisation extends Model
{
    protected $table = 'perennisation';

    protected $fillable = [
        'fiche_id',
        'type',
        'responsable_id',
        'date',
        'statut',
        'preuve',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function fiche(): BelongsTo
    {
        return $this->belongsTo(FicheA3::class, 'fiche_id');
    }

    public function responsable(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsable_id');
    }
}
