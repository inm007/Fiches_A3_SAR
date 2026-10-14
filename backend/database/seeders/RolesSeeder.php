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
            ['code' => 'VALIDEUR_PRODUCTION', 'libelle' => 'Valideur Production / Exploitation', 'description' => 'Approuve ou refuse le plan ; toujours sollicité en premier.'],
            ['code' => 'VALIDEUR_HSE', 'libelle' => 'Valideur HSE', 'description' => 'Valide le domaine QHSE.'],
            ['code' => 'VALIDEUR_PROCEDE', 'libelle' => 'Valideur Procédé / Technique', 'description' => 'Valide les domaines Procédé et Sûreté / Cybersécurité.'],
            ['code' => 'VALIDEUR_MAINTENANCE', 'libelle' => 'Valideur Maintenance', 'description' => 'Valide le domaine Fiabilité.'],
            ['code' => 'VALIDEUR_INSPECTION', 'libelle' => 'Valideur Inspection / Intégrité', 'description' => 'Valide le domaine Intégrité.'],
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
