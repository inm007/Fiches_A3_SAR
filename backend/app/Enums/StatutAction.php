<?php

namespace App\Enums;

/**
 * Statuts d'une action (PRD §5.1, D14).
 */
enum StatutAction: string
{
    case AFaire = 'A_FAIRE';
    case EnCours = 'EN_COURS';
    case Realise = 'REALISE';
    case Annule = 'ANNULE';
    case Bloque = 'BLOQUE';

    public function libelle(): string
    {
        return match ($this) {
            self::AFaire => 'À faire',
            self::EnCours => 'En cours',
            self::Realise => 'Réalisée',
            self::Annule => 'Annulée',
            self::Bloque => 'Bloquée',
        };
    }

    public function estTerminee(): bool
    {
        return in_array($this, [self::Realise, self::Annule], true);
    }

    public function exigeMotif(): bool
    {
        return in_array($this, [self::Annule, self::Bloque], true);
    }
}
