<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

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

    protected function casts(): array
    {
        return [
            'date' => 'date',
        ];
    }

    public function fiche(): BelongsTo
    {
        return $this->belongsTo(FicheA3::class, 'fiche_id');
    }

    public function responsable(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsable_id');
    }

    /**
     * Documents ou photos joints comme preuve de cette action de pérennisation.
     */
    public function piecesJointes(): MorphMany
    {
        return $this->morphMany(PieceJointe::class, 'objet');
    }

    /**
     * Preuve d'une action réalisée : une référence écrite ou au moins un fichier joint.
     */
    public function aUnePreuve(): bool
    {
        $fichiers = $this->pieces_jointes_count ?? $this->piecesJointes()->count();

        return filled($this->preuve) || $fichiers > 0;
    }
}
