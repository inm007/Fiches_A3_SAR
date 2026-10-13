<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Lecon extends Model
{
    protected $table = 'lecons';

    protected $fillable = [
        'fiche_id',
        'rubrique',
        'texte',
    ];

    public function fiche(): BelongsTo
    {
        return $this->belongsTo(FicheA3::class, 'fiche_id');
    }
}
