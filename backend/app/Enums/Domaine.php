<?php

namespace App\Enums;

/**
 * Domaines concernés (section 7) : chacun sollicite un ou plusieurs directeurs à la porte 1.
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

    public function libelle(): string
    {
        return match ($this) {
            self::Qhse => 'QHSE',
            self::Procede => 'Procédé',
            self::Fiabilite => 'Fiabilité',
            self::Integrite => 'Intégrité',
            self::Production => 'Production',
            self::SureteCybersecurite => 'Sûreté / Cybersécurité',
            self::Autres => 'Autres',
        };
    }

    /**
     * Directeurs sollicités à la porte 1 à l'installation ; l'administrateur fonctionnel
     * modifie ensuite la correspondance (écran Circuit de validation, table domaine_roles).
     * « Autres » n'a pas de correspondance : le pilote choisit le directeur sur la fiche.
     *
     * @return array<int, string>
     */
    public function rolesParDefaut(): array
    {
        return match ($this) {
            self::Qhse => ['VALIDEUR_HSE'],
            self::Procede, self::Fiabilite, self::Integrite => ['VALIDEUR_PROCEDE'],
            self::SureteCybersecurite => ['VALIDEUR_PROCEDE', 'VALIDEUR_DSI'],
            self::Production => ['VALIDEUR_PRODUCTION'],
            self::Autres => [],
        };
    }

    /**
     * Rôles de directeurs qui valident le plan (porte 1).
     *
     * @return array<int, string>
     */
    public static function rolesValideurs(): array
    {
        return ['VALIDEUR_PRODUCTION', 'VALIDEUR_HSE', 'VALIDEUR_PROCEDE', 'VALIDEUR_DSI', 'VALIDEUR_MAINTENANCE', 'VALIDEUR_INSPECTION'];
    }
}
