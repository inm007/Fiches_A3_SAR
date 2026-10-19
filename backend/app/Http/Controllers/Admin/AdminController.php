<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Affectation;
use App\Models\JournalAdministration;
use App\Models\Unite;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Base des écrans d'administration fonctionnelle (routes /api/admin, rôle ADMIN_FONCTIONNEL).
 * Chaque modification est tracée dans le journal d'administration, distinct de l'historique métier.
 */
abstract class AdminController extends Controller
{
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
}
