<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompteurFiche extends Model
{
    protected $table = 'compteurs_fiches';

    protected $primaryKey = 'annee';

    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = [
        'annee',
        'derniere_valeur',
    ];

    protected function casts(): array
    {
        return [
            'annee' => 'integer',
            'derniere_valeur' => 'integer',
        ];
    }
}
