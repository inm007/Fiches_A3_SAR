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

    /**
     * Numéro A3-AAAA-NNN suivant pour l'année, sous verrou de ligne (remis à 001 chaque année).
     * Doit être appelé dans une transaction.
     */
    public static function prochainNumero(int $annee): string
    {
        static::query()->insertOrIgnore(['annee' => $annee, 'derniere_valeur' => 0]);

        $valeur = (int) static::query()->where('annee', $annee)->lockForUpdate()->value('derniere_valeur') + 1;
        static::query()->where('annee', $annee)->update(['derniere_valeur' => $valeur]);

        return sprintf('A3-%d-%03d', $annee, $valeur);
    }
}
