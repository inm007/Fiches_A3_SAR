<?php

namespace App\Enums;

/**
 * Étapes de la fiche (PRD §5.1). Seul FicheWorkflow modifie l'étape d'une fiche.
 */
enum StatutEtape: string
{
    case Ouvert = 'OUVERT';
    case EnCours = 'EN_COURS';
    case EnValidationPlan = 'EN_VALIDATION_PLAN';
    case RealisationActions = 'REALISATION_ACTIONS';
    case MesureResultats = 'MESURE_RESULTATS';
    case VerificationMaintien = 'VERIFICATION_MAINTIEN';
    case EnValidationCloture = 'EN_VALIDATION_CLOTURE';
    case EnAttente = 'EN_ATTENTE';
    case Cloture = 'CLOTURE';
    case ClasseSansSuite = 'CLASSE_SANS_SUITE';

    public function libelle(): string
    {
        return match ($this) {
            self::Ouvert => 'Ouvert',
            self::EnCours => 'En cours',
            self::EnValidationPlan => 'En validation du plan',
            self::RealisationActions => 'Réalisation des actions',
            self::MesureResultats => 'Mesure des résultats',
            self::VerificationMaintien => 'Vérification du maintien',
            self::EnValidationCloture => 'En validation de clôture',
            self::EnAttente => 'En attente',
            self::Cloture => 'Clôturé',
            self::ClasseSansSuite => 'Classée sans suite',
        };
    }

    /**
     * Statut général de la fiche papier, utilisé dans les listes (PRD §5.1).
     */
    public function statutGeneral(): string
    {
        return match ($this) {
            self::Ouvert => 'OUVERT',
            self::EnAttente => 'EN_ATTENTE',
            self::Cloture => 'CLOTURE',
            self::ClasseSansSuite => 'CLASSE',
            default => 'EN_COURS',
        };
    }

    /**
     * Étapes de suivi après la validation du plan : actions, contrôles, gains et pérennisation
     * y sont modifiables.
     *
     * @return array<int, self>
     */
    public static function etapesDeSuivi(): array
    {
        return [self::RealisationActions, self::MesureResultats, self::VerificationMaintien];
    }

    /**
     * Étape active : une mise en attente (T12) est possible depuis celle-ci.
     */
    public function estActive(): bool
    {
        return ! in_array($this, [self::EnAttente, ...self::finales()], true);
    }

    /**
     * Étapes finales : la fiche ne bouge plus (clôturée ou classée sans suite).
     *
     * @return array<int, self>
     */
    public static function finales(): array
    {
        return [self::Cloture, self::ClasseSansSuite];
    }

    /**
     * @return array<int, string>
     */
    public static function valeursFinales(): array
    {
        return array_map(fn (self $etape) => $etape->value, self::finales());
    }

    public function estFinale(): bool
    {
        return in_array($this, self::finales(), true);
    }
}
