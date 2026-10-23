<?php

namespace App\Services;

use App\Models\Affectation;
use App\Models\Entite;
use App\Models\Role;
use App\Models\User;

/**
 * Organigramme : il donne le profil « Chef de département » au responsable de chaque
 * département actif (et le retire quand il ne l'est plus), et propose au pilote le chef
 * de son propre département pour la validation de la pertinence (porte 0).
 */
class Organigramme
{
    public const string ROLE_CHEF = 'CHEF_DEPARTEMENT';

    /**
     * Département actif de rattachement de l'utilisateur : son entité si c'est un département,
     * sinon le département au-dessus de son service. Null s'il est rattaché à une direction ou à rien.
     */
    public function departementDe(?User $user): ?Entite
    {
        $departement = $user?->entite?->ancetre('DEPARTEMENT');

        return $departement?->actif ? $departement : null;
    }

    /**
     * Chef proposé par défaut au pilote : le responsable actif de son département.
     */
    public function chefPropose(?User $user): ?int
    {
        $chef = $this->departementDe($user)?->responsable;

        return $chef !== null && $chef->actif ? $chef->id : null;
    }

    /**
     * Met les affectations « Chef de département » en accord avec les responsables des
     * départements actifs : création ou réactivation pour un nouveau chef, désactivation
     * pour un ancien. Les demandes en attente restent à réattribuer si besoin.
     */
    public function synchroniserChefs(): void
    {
        $roleId = Role::where('code', self::ROLE_CHEF)->value('id');
        if ($roleId === null) {
            return;
        }

        $chefs = Entite::query()
            ->where('type', 'DEPARTEMENT')
            ->where('actif', true)
            ->whereNotNull('responsable_id')
            ->pluck('responsable_id')
            ->unique();

        foreach ($chefs as $userId) {
            Affectation::query()->updateOrCreate(
                ['user_id' => $userId, 'role_id' => $roleId, 'unite_id' => null],
                ['actif' => true, 'date_fin' => null],
            );
        }

        Affectation::query()
            ->where('role_id', $roleId)
            ->where('actif', true)
            ->whereNotIn('user_id', $chefs)
            ->update(['actif' => false]);
    }
}
