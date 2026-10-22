<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RolesSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['code' => 'AGENT', 'libelle' => 'Agent', 'description' => 'Déclare des fiches A3 et suit ses actions.'],
            ['code' => 'PILOTE', 'libelle' => 'Pilote', 'description' => 'Complète et pilote les fiches A3 qui lui sont confiées.'],
            ['code' => 'CHEF_DEPARTEMENT', 'libelle' => 'Chef de département', 'description' => 'Valide la pertinence des fiches déclarées dans son département (porte 0). Rôle attribué par l’organigramme.'],
            ['code' => 'VALIDEUR_PRODUCTION', 'libelle' => 'Directeur Production / Exploitation', 'description' => 'Valide le plan quand le domaine Production est coché.'],
            ['code' => 'VALIDEUR_HSE', 'libelle' => 'Directeur QHSE (DHSE)', 'description' => 'Valide le plan quand le domaine QHSE est coché.'],
            ['code' => 'VALIDEUR_PROCEDE', 'libelle' => 'Directeur technique (DT)', 'description' => 'Valide le plan pour les domaines Procédé, Fiabilité, Intégrité et Sûreté / Cybersécurité.'],
            ['code' => 'VALIDEUR_DSI', 'libelle' => 'Directeur des systèmes d’information (DSI)', 'description' => 'Valide le plan quand le domaine Sûreté / Cybersécurité est coché.'],
            ['code' => 'VALIDEUR_MAINTENANCE', 'libelle' => 'Valideur Maintenance', 'description' => 'Valideur disponible pour la correspondance des domaines (écran Circuit de validation).'],
            ['code' => 'VALIDEUR_INSPECTION', 'libelle' => 'Valideur Inspection / Intégrité', 'description' => 'Valideur disponible pour la correspondance des domaines (écran Circuit de validation).'],
            ['code' => 'CONTROLE_GESTION', 'libelle' => 'Contrôle de gestion', 'description' => 'Valide les gains chiffrés.'],
            ['code' => 'DIRECTION', 'libelle' => 'Direction', 'description' => 'Dispose de la vue globale et valide les clôtures.'],
            ['code' => 'ADMIN_FONCTIONNEL', 'libelle' => 'Administrateur fonctionnel', 'description' => 'Gère les comptes, rôles, affectations et référentiels.'],
            ['code' => 'ADMIN_TECHNIQUE', 'libelle' => 'Administrateur technique', 'description' => 'Configure le courriel et surveille l’état technique, sans accès au contenu des fiches.'],
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(['code' => $role['code']], $role);
        }
    }
}
