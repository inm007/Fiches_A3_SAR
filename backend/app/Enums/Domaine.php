<?php

namespace App\Enums;

/**
 * Domaines concernés (section 7) et valideur sollicité à la porte 1 (PRD §7).
 */
enum Domaine: string
{
    case Qhse = 'QHSE';
    case Procede = 'PROCEDE';
    case Fiabilite = 'FIABILITE';
    case Integrite = 'INTEGRITE';
    case Production = 'PRODUCTION';
    case SureteCybersecurite = 'SURETE_CYBERSECURITE';
    case Autres = 'AUTRES';

    /**
     * Rôle valideur déduit du domaine ; « Autres » est choisi par le pilote.
     */
    public function roleValideur(): ?string
    {
        return match ($this) {
            self::Qhse => 'VALIDEUR_HSE',
            self::Procede, self::SureteCybersecurite => 'VALIDEUR_PROCEDE',
            self::Fiabilite => 'VALIDEUR_MAINTENANCE',
            self::Integrite => 'VALIDEUR_INSPECTION',
            self::Production => 'VALIDEUR_PRODUCTION',
            self::Autres => null,
        };
    }

    /**
     * @return array<int, string>
     */
    public static function rolesValideurs(): array
    {
        return ['VALIDEUR_PRODUCTION', 'VALIDEUR_HSE', 'VALIDEUR_PROCEDE', 'VALIDEUR_MAINTENANCE', 'VALIDEUR_INSPECTION'];
    }
}
