<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Fournisseur d'authentification
    |--------------------------------------------------------------------------
    |
    | Implémentation active de AuthProvider (TRD §17). « local » vérifie le
    | mot de passe haché en base ; « ldap » est un point d'extension laissé
    | à la SAR et reste désactivé tant qu'il n'est pas implémenté.
    |
    */

    'auth_provider' => env('AUTH_PROVIDER', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Annuaire
    |--------------------------------------------------------------------------
    |
    | Où l'administrateur fonctionnel choisit la personne d'un compte annuaire.
    | « demo » propose des personnes fictives ; « ldap » interroge le serveur
    | ci-dessous avec un compte de service en lecture.
    |
    */

    'annuaire' => env('ANNUAIRE', 'demo'),

    'ldap' => [
        'url' => env('LDAP_URL', 'ldap://127.0.0.1:389'),
        'base_dn' => env('LDAP_BASE_DN', ''),
        'bind_dn' => env('LDAP_BIND_DN', ''),
        'bind_password' => env('LDAP_BIND_PASSWORD', ''),
        'filtre' => env('LDAP_FILTRE', '(objectClass=person)'),
        'attributs' => [
            'identifiant' => env('LDAP_ATTR_IDENTIFIANT', 'uid'),
            'nom' => env('LDAP_ATTR_NOM', 'sn'),
            'prenom' => env('LDAP_ATTR_PRENOM', 'givenName'),
            'email' => env('LDAP_ATTR_EMAIL', 'mail'),
            'fonction' => env('LDAP_ATTR_FONCTION', 'title'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Passerelle SAP
    |--------------------------------------------------------------------------
    |
    | Faux par défaut : NullSapGateway est utilisé et aucun appel n'est fait.
    |
    */

    'sap_enabled' => (bool) env('SAP_ENABLED', false),

];
