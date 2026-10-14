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
    | Passerelle SAP
    |--------------------------------------------------------------------------
    |
    | Faux par défaut : NullSapGateway est utilisé et aucun appel n'est fait.
    |
    */

    'sap_enabled' => (bool) env('SAP_ENABLED', false),

];
