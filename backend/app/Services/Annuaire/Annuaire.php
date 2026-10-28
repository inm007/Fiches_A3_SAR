<?php

namespace App\Services\Annuaire;

/**
 * Annuaire de l'entreprise où l'administrateur fonctionnel choisit la personne à qui ouvrir
 * un compte. L'implémentation active se règle par ANNUAIRE dans backend/.env (config a3.annuaire).
 */
interface Annuaire
{
    /**
     * Personnes dont l'identifiant, le nom, le prénom ou le courriel contient le terme.
     *
     * @return array<int, array{ldap_dn: string, identifiant: string, nom: string, prenom: string, email: string, fonction: ?string}>
     */
    public function rechercher(string $terme, int $limite = 20): array;

    /**
     * « demo » ou « ldap » : l'écran signale quand l'annuaire n'est pas encore branché.
     */
    public function source(): string;
}
