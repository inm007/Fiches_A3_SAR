<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Copie figée de la fiche, prise à la soumission du plan (T3) et à la clôture (T9) :
 * la version d'origine reste consultable et imprimable après une nouvelle boucle.
 */
class FicheVersion extends Model
{
    protected $table = 'fiche_versions';

    protected $fillable = ['fiche_id', 'version', 'evenement', 'contenu', 'auteur_id'];

    protected function casts(): array
    {
        return ['contenu' => 'array', 'version' => 'integer'];
    }

    public function fiche(): BelongsTo
    {
        return $this->belongsTo(FicheA3::class, 'fiche_id');
    }

    public function auteur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'auteur_id');
    }
}
