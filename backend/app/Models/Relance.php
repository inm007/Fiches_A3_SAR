<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Relance extends Model
{
    protected $table = 'relances';

    protected $fillable = [
        'cible_type',
        'cible_id',
        'auteur_id',
        'destinataire_id',
        'jour',
        'mode',
    ];

    protected function casts(): array
    {
        return [
            'jour' => 'date',
        ];
    }

    public function auteur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'auteur_id');
    }

    public function destinataire(): BelongsTo
    {
        return $this->belongsTo(User::class, 'destinataire_id');
    }

    public function cible(): MorphTo
    {
        return $this->morphTo();
    }
}
