<?php

namespace App\Enums;

/**
 * Droits que l'administrateur fonctionnel règle par rôle (écran Droits des rôles).
 * Pour chaque rôle, un droit est dans l'un de quatre états :
 * - toujours : indispensable au rôle, accordé d'office et non modifiable ;
 * - sur ses fiches : le pilote l'exerce sur les fiches qu'il pilote, non modifiable ;
 * - réglable : l'administrateur l'accorde ou le retire ;
 * - non applicable : sans objet pour ce rôle (administrateurs, rôles qui ne verraient pas la fiche).
 * Un droit ne s'exerce que sur les fiches visibles par le profil.
 */
enum Permission: string
{
    case DeclarerFiche = 'DECLARER_FICHE';
    case VoirHistorique = 'VOIR_HISTORIQUE';
    case Commenter = 'COMMENTER';
    case Relancer = 'RELANCER';
    case MettreEnAttente = 'METTRE_EN_ATTENTE';

    public const string TOUJOURS = 'TOUJOURS';

    public const string SUR_SES_FICHES = 'SUR_SES_FICHES';

    public const string REGLABLE = 'REGLABLE';

    public const string NON_APPLICABLE = 'NON_APPLICABLE';

    public function libelle(): string
    {
        return match ($this) {
            self::DeclarerFiche => 'Déclarer une fiche',
            self::VoirHistorique => 'Consulter l’historique',
            self::Commenter => 'Commenter',
            self::Relancer => 'Relancer',
            self::MettreEnAttente => 'Mettre en attente',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::DeclarerFiche => 'Ouvrir une nouvelle fiche A3 pour signaler un problème constaté sur le terrain.',
            self::VoirHistorique => 'Voir le journal d’une fiche : qui a modifié quoi, quand et pour quel motif.',
            self::Commenter => 'Échanger avec le pilote et les valideurs par des commentaires sur la fiche.',
            self::Relancer => 'Envoyer un rappel au responsable d’une action en retard ou à un valideur qui n’a pas encore répondu.',
            self::MettreEnAttente => 'Suspendre une fiche bloquée, avec un motif obligatoire, puis lever le blocage.',
        };
    }

    /**
     * Rôles qui ont ce droit d'office : le leur retirer empêcherait le rôle de faire son travail.
     *
     * @return list<string>
     */
    public function rolesToujours(): array
    {
        return match ($this) {
            self::DeclarerFiche, self::Commenter => ['AGENT', 'PILOTE'],
            self::VoirHistorique => ['PILOTE'],
            self::Relancer, self::MettreEnAttente => [],
        };
    }

    /**
     * Rôles qui exercent ce droit seulement sur les fiches qu'ils pilotent (règle fixe, appliquée par le workflow).
     *
     * @return list<string>
     */
    public function rolesSurSesFiches(): array
    {
        return match ($this) {
            self::Relancer, self::MettreEnAttente => ['PILOTE'],
            default => [],
        };
    }

    /**
     * Rôles pour lesquels l'administrateur accorde ou retire ce droit.
     *
     * @return list<string>
     */
    public function rolesReglables(): array
    {
        $decideurs = ['CHEF_DEPARTEMENT', ...Domaine::rolesValideurs(), 'CONTROLE_GESTION', 'DIRECTION'];

        return match ($this) {
            self::DeclarerFiche => ['DIRECTION'],
            self::VoirHistorique => ['AGENT', ...$decideurs, 'ADMIN_FONCTIONNEL'],
            self::Commenter => $decideurs,
            self::Relancer => [...$decideurs, 'ADMIN_FONCTIONNEL'],
            self::MettreEnAttente => ['DIRECTION'],
        };
    }

    /**
     * Rôles réglables qui ont le droit à l'installation.
     *
     * @return list<string>
     */
    public function rolesParDefaut(): array
    {
        return match ($this) {
            self::DeclarerFiche => [],
            self::VoirHistorique => ['DIRECTION', 'ADMIN_FONCTIONNEL'],
            self::Commenter => ['CHEF_DEPARTEMENT', ...Domaine::rolesValideurs(), 'CONTROLE_GESTION', 'DIRECTION'],
            self::Relancer => ['DIRECTION', 'ADMIN_FONCTIONNEL'],
            self::MettreEnAttente => ['DIRECTION'],
        };
    }

    public function etat(string $roleCode): string
    {
        return match (true) {
            in_array($roleCode, $this->rolesToujours(), true) => self::TOUJOURS,
            in_array($roleCode, $this->rolesSurSesFiches(), true) => self::SUR_SES_FICHES,
            in_array($roleCode, $this->rolesReglables(), true) => self::REGLABLE,
            default => self::NON_APPLICABLE,
        };
    }

    public function estReglable(string $roleCode): bool
    {
        return $this->etat($roleCode) === self::REGLABLE;
    }
}
