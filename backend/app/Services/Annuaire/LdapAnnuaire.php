<?php

namespace App\Services\Annuaire;

use App\Exceptions\RegleMetierException;

/**
 * Annuaire LDAP (ou Active Directory) de la SAR, lu avec le compte de service LDAP_BIND_DN.
 * Les attributs lus se règlent dans config/a3.php (section ldap).
 */
class LdapAnnuaire implements Annuaire
{
    public function rechercher(string $terme, int $limite = 20): array
    {
        if (! function_exists('ldap_connect')) {
            throw new RegleMetierException('L’extension PHP LDAP n’est pas installée sur le serveur : l’annuaire ne peut pas être consulté.', status: 503);
        }

        $config = config('a3.ldap');
        $connexion = ldap_connect($config['url']);
        if ($connexion === false) {
            throw new RegleMetierException('L’adresse de l’annuaire (LDAP_URL) est invalide.', status: 503);
        }
        ldap_set_option($connexion, LDAP_OPT_PROTOCOL_VERSION, 3);
        ldap_set_option($connexion, LDAP_OPT_REFERRALS, 0);
        ldap_set_option($connexion, LDAP_OPT_NETWORK_TIMEOUT, 5);

        try {
            if (! @ldap_bind($connexion, $config['bind_dn'] ?: null, $config['bind_password'] ?: null)) {
                throw new RegleMetierException('Connexion à l’annuaire impossible : vérifiez LDAP_URL, LDAP_BIND_DN et LDAP_BIND_PASSWORD.', status: 503);
            }

            $attributs = $config['attributs'];
            $valeur = ldap_escape(trim($terme), '', LDAP_ESCAPE_FILTER);
            $criteres = $valeur === ''
                ? ''
                : '(|'.collect([$attributs['identifiant'], $attributs['nom'], $attributs['prenom'], $attributs['email']])
                    ->map(fn (string $attribut) => "({$attribut}=*{$valeur}*)")
                    ->implode('').')';

            $resultat = @ldap_search($connexion, $config['base_dn'], "(&{$config['filtre']}{$criteres})", array_values($attributs), 0, $limite);
            if ($resultat === false) {
                // Dépassement de la limite de taille : on garde les premières entrées renvoyées.
                if (ldap_errno($connexion) !== 4) {
                    throw new RegleMetierException('La recherche dans l’annuaire a échoué : '.ldap_error($connexion).'.', status: 503);
                }
            }
            $entrees = $resultat === false ? ['count' => 0] : ldap_get_entries($connexion, $resultat);
        } finally {
            ldap_unbind($connexion);
        }

        $lire = fn (array $entree, string $attribut) => $entree[strtolower($attribut)][0] ?? null;
        $personnes = [];
        for ($i = 0; $i < $entrees['count']; $i++) {
            $entree = $entrees[$i];
            $identifiant = $lire($entree, $attributs['identifiant']);
            if ($identifiant === null) {
                continue;
            }
            $personnes[] = [
                'ldap_dn' => $entree['dn'],
                'identifiant' => $identifiant,
                'nom' => $lire($entree, $attributs['nom']) ?? '',
                'prenom' => $lire($entree, $attributs['prenom']) ?? '',
                'email' => $lire($entree, $attributs['email']) ?? '',
                'fonction' => $lire($entree, $attributs['fonction']),
            ];
        }

        return $personnes;
    }

    public function source(): string
    {
        return 'ldap';
    }
}
