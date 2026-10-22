<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FicheA3Domaine extends Model
{
    protected $table = 'fiche_domaines';

    protected $fillable = [
        'fiche_id',
        'domaine',
        'valideur_role_id',
        'precision',
    ];

    public function fiche(): BelongsTo
    {
        return $this->belongsTo(FicheA3::class, 'fiche_id');
    }

    public function roleValideur(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'valideur_role_id');
    }
}
