<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Parametre extends Model
{
    protected $table = 'parametres';

    protected $fillable = [
        'cle',
        'valeur',
    ];

    /**
     * Paramètres fonctionnels (écran Paramètres) et leur valeur par défaut.
     */
    public const array DEFAUTS_FONCTIONNELS = [
        'reminder_interval_days' => 7,
        'validation_reminders_enabled' => true,
        'attachment_max_size_mb' => 10,
        'attachment_max_files' => 20,
    ];

    /**
     * Valeurs enregistrées des paramètres fonctionnels, complétées par les valeurs par défaut.
     *
     * @return array<string, int|bool>
     */
    public static function fonctionnels(): array
    {
        $valeurs = self::DEFAUTS_FONCTIONNELS;
        foreach (static::query()->whereIn('cle', array_keys(self::DEFAUTS_FONCTIONNELS))->pluck('valeur', 'cle') as $cle => $brut) {
            $defaut = self::DEFAUTS_FONCTIONNELS[$cle];
            $valeurs[$cle] = is_bool($defaut)
                ? (filter_var($brut, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? $defaut)
                : (is_numeric($brut) && (int) $brut > 0 ? (int) $brut : $defaut);
        }

        return $valeurs;
    }
}
