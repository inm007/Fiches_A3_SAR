<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Unite extends Model
{
    protected $table = 'unites';

    protected $fillable = [
        'code',
        'libelle',
        'actif',
    ];

    public function affectations(): HasMany
    {
        return $this->hasMany(Affectation::class);
    }

    public function equipements(): HasMany
    {
        return $this->hasMany(Equipement::class, 'unite_id');
    }

    public function fiches(): HasMany
    {
        return $this->hasMany(FicheA3::class, 'unite_id');
    }
}
