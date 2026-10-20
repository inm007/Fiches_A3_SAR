<?php

namespace App\Enums;

/**
 * Droits que l'administrateur fonctionnel accorde ou retire à un rôle (écran Droits).
 * Le reste de la matrice du PRD §2.3 reste verrouillé : circuit de validation, visibilité,
 * confidentialité, administration. Un droit ne s'exerce que sur les fiches visibles par le profil.
 */
enum Permission: string
{
    case DeclarerFiche = 'DECLARER_FICHE';
    case VoirHistorique = 'VOIR_HISTORIQUE';
    case Commenter = 'COMMENTER';
    case Relancer = 'RELANCER';
    case MettreEnAttente = 'METTRE_EN_ATTENTE';

    public function libelle(): string
    {
        return match ($this) {
            self::DeclarerFiche => 'Déclarer une fiche',
            self::VoirHistorique => 'Consulter l’historique d’une fiche',
            self::Commenter => 'Commenter une fiche',
            self::Relancer => 'Relancer une action ou une validation',
            self::MettreEnAttente => 'Mettre en attente et lever le blocage',
        };
    }

    /**
     * Ce que le droit ne retire jamais au pilote désigné de la fiche.
     */
    public function description(): string
    {
        return match ($this) {
            self::DeclarerFiche => 'Ouvre une nouvelle fiche A3 dans une unité.',
            self::VoirHistorique => 'Le pilote de la fiche voit toujours son historique.',
            self::Commenter => 'Ajoute un commentaire sur les fiches visibles.',
            self::Relancer => 'Le pilote de la fiche peut toujours relancer.',
            self::MettreEnAttente => 'Le pilote de la fiche peut toujours la mettre en attente.',
        };
    }

    /**
     * Rôles du PRD §2.3 qui ont ce droit à l'installation.
     *
     * @return list<string>
     */
    public function rolesParDefaut(): array
    {
        return match ($this) {
            self::DeclarerFiche => ['AGENT', 'PILOTE'],
            self::VoirHistorique => ['PILOTE', 'DIRECTION', 'ADMIN_FONCTIONNEL'],
            self::Commenter => ['AGENT', 'PILOTE', ...Domaine::rolesValideurs(), 'CONTROLE_GESTION', 'DIRECTION'],
            self::Relancer => ['DIRECTION', 'ADMIN_FONCTIONNEL'],
            self::MettreEnAttente => ['DIRECTION'],
        };
    }

    /**
     * Rôles auxquels ce droit peut être accordé. Les autres cases restent verrouillées :
     * les administrateurs n'ont aucun contenu métier (PRD §2.1), et seuls les rôles qui
     * voient leurs propres déclarations peuvent déclarer.
     *
     * @return list<string>
     */
    public function rolesEligibles(): array
    {
        $metier = ['AGENT', 'PILOTE', ...Domaine::rolesValideurs(), 'CONTROLE_GESTION', 'DIRECTION'];

        return match ($this) {
            self::DeclarerFiche => ['AGENT', 'PILOTE', 'DIRECTION'],
            self::VoirHistorique, self::Relancer => [...$metier, 'ADMIN_FONCTIONNEL'],
            self::Commenter, self::MettreEnAttente => $metier,
        };
    }

    public function estEligible(string $roleCode): bool
    {
        return in_array($roleCode, $this->rolesEligibles(), true);
    }
}
