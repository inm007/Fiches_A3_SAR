<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Liste extends Model
{
    protected $table = 'listes';

    protected $fillable = [
        'code',
        'libelle',
        'description',
    ];

    public function valeurs(): HasMany
    {
        return $this->hasMany(ValeurListe::class, 'liste_id');
    }
}
