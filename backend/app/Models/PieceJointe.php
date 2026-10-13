<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class PieceJointe extends Model
{
    protected $table = 'pieces_jointes';

    protected $fillable = [
        'fiche_id',
        'objet_type',
        'objet_id',
        'nom_origine',
        'nom_stockage',
        'type_mime',
        'taille',
        'empreinte',
        'auteur_id',
    ];

    public function fiche(): BelongsTo
    {
        return $this->belongsTo(FicheA3::class, 'fiche_id');
    }

    public function auteur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'auteur_id');
    }

    public function objet(): MorphTo
    {
        return $this->morphTo();
    }
}
