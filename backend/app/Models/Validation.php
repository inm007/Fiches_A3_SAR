<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Validation extends Model
{
    protected $table = 'validations';

    protected $fillable = [
        'fiche_id',
        'porte',
        'role_id',
        'valideur_id',
        'decision',
        'commentaire',
        'version_fiche',
        'empreinte_domaine',
        'demandee_le',
        'decidee_le',
        'ordre',
    ];

    protected function casts(): array
    {
        return [
            'empreinte_domaine' => 'array',
            'demandee_le' => 'datetime',
            'decidee_le' => 'datetime',
        ];
    }

    public function fiche(): BelongsTo
    {
        return $this->belongsTo(FicheA3::class, 'fiche_id');
    }

    public function valideur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'valideur_id');
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }
}
