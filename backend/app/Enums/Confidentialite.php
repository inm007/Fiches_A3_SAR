<?php

namespace App\Enums;

/**
 * Confidentialité d'une fiche : une fiche restreinte n'est visible que de ceux qui y
 * participent (PRD §2.5).
 */
enum Confidentialite: string
{
    case Normal = 'NORMAL';
    case Restreint = 'RESTREINT';
}
