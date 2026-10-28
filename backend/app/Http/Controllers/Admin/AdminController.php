<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Affectation;
use App\Models\JournalAdministration;
use App\Models\Role;
use App\Models\Unite;
use App\Services\Organigramme;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Base des écrans d'administration fonctionnelle (routes /api/admin, rôle ADMIN_FONCTIONNEL).
 * Chaque modification est tracée dans le journal d'administration, distinct de l'historique métier.
 */
abstract class AdminController extends Controller
{
    /**
     * Rôles rattachés à une unité ; les autres (Contrôle de gestion, Direction, administrateurs) sont globaux.
     */
    protected const array ROLES_PAR_UNITE = ['AGENT', 'PILOTE', 'VALIDEUR_PRODUCTION', 'VALIDEUR_HSE', 'VALIDEUR_PROCEDE', 'VALIDEUR_DSI', 'VALIDEUR_MAINTENANCE', 'VALIDEUR_INSPECTION'];

    /**
     * @param  array<string, mixed>  $detail
     */
    protected function audit(Request $request, string $operation, string $objet, ?int $id, array $detail): void
    {
        JournalAdministration::create([
            'auteur_id' => $request->user()->id,
            'operation' => $operation,
            'objet' => $objet.($id === null ? '' : ':'.$id),
            'detail' => $detail,
            'created_at' => now(),
        ]);
    }

    /**
     * Format d'une affectation, partagé par les écrans Utilisateurs et Affectations.
     *
     * @return array<string, mixed>
     */
    protected function affectationData(Affectation $affectation): array
    {
        $relation = fn (string $name, array $fields) => $affectation->relationLoaded($name) && $affectation->{$name}
            ? $affectation->{$name}->only($fields)
            : null;

        return [
            ...$affectation->only(['id', 'user_id', 'role_id', 'unite_id', 'actif', 'date_debut', 'date_fin']),
            'user' => $relation('user', ['id', 'identifiant', 'nom', 'prenom', 'email', 'actif']),
            'role' => $relation('role', ['id', 'code', 'libelle']),
            'unite' => $relation('unite', ['id', 'code', 'libelle']),
        ];
    }

    /**
     * Une unité choisie dans un écran d'administration doit exister et être active.
     */
    protected function validerUniteActive(int|string|null $uniteId): void
    {
        if ($uniteId !== null && ! Unite::query()->whereKey($uniteId)->where('actif', true)->exists()) {
            throw ValidationException::withMessages(['unite_id' => 'L’unité sélectionnée n’existe pas ou est inactive.']);
        }
    }

    /**
     * Un rôle d'unité exige une unité active ; un rôle global n'en a pas.
     */
    protected function validerPerimetre(int $roleId, int|string|null $uniteId, bool $exigerUniteActive = true): void
    {
        $code = Role::query()->findOrFail($roleId)->code;
        if ($code === Organigramme::ROLE_CHEF) {
            throw ValidationException::withMessages(['role_id' => 'Le profil Chef de département suit l’organigramme : désignez le responsable du département dans l’écran Organigramme.']);
        }
        $parUnite = in_array($code, self::ROLES_PAR_UNITE, true);
        if ($parUnite !== ($uniteId !== null)) {
            throw ValidationException::withMessages(['unite_id' => $parUnite
                ? 'Ce rôle nécessite une affectation à une unité.'
                : 'Ce rôle est global et ne peut pas être rattaché à une unité.']);
        }

        if ($exigerUniteActive) {
            $this->validerUniteActive($uniteId);
        }
    }
}
