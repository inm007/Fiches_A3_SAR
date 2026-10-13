<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FicheA3Mesure extends Model
{
    protected $table = 'mesures';

    protected $fillable = [
        'indicateur_id',
        'type',
        'valeur',
        'date_mesure',
        'periode_verification',
    ];

    protected $casts = [
        'valeur' => 'decimal:4',
        'date_mesure' => 'date',
    ];

    public function indicateur(): BelongsTo
    {
        return $this->belongsTo(FicheA3Indicateur::class, 'indicateur_id');
    }
}
