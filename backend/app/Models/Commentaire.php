<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Commentaire extends Model
{
    protected $table = 'commentaires';

    protected $fillable = [
        'fiche_id',
        'auteur_id',
        'contexte',
        'objet_id',
        'texte',
    ];

    public function fiche(): BelongsTo
    {
        return $this->belongsTo(FicheA3::class, 'fiche_id');
    }

    public function auteur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'auteur_id');
    }
}
