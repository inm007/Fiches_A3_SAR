<?php

namespace App\Http\Controllers\Admin;

use App\Models\Affectation;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Écran Affectations : un rôle porté par un utilisateur, dans une unité ou sur le périmètre global.
 */
class AffectationController extends AdminController
{
    /**
     * Rôles rattachés à une unité ; les autres (Contrôle de gestion, Direction, administrateurs) sont globaux.
     */
    private const array ROLES_PAR_UNITE = ['AGENT', 'PILOTE', 'VALIDEUR_PRODUCTION', 'VALIDEUR_HSE', 'VALIDEUR_PROCEDE', 'VALIDEUR_MAINTENANCE', 'VALIDEUR_INSPECTION'];

    /**
     * Rôles en lecture seule : leur définition est fixée par les seeders.
     */
    public function roles(): JsonResponse
    {
        return response()->json(['data' => Role::query()->orderBy('id')->get(['id', 'code', 'libelle'])]);
    }

    public function index(): JsonResponse
    {
        $affectations = Affectation::query()
            ->with(['user:id,identifiant,nom,prenom,email,actif', 'role:id,code,libelle', 'unite:id,code,libelle'])
            ->orderBy('id')
            ->get();

        return response()->json(['data' => $affectations->map(fn (Affectation $affectation) => $this->affectationData($affectation))]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'role_id' => ['required', 'integer', 'exists:roles,id'],
            'unite_id' => ['present', 'nullable', 'integer', 'exists:unites,id'],
            'actif' => ['sometimes', 'boolean'],
            'date_debut' => ['sometimes', 'nullable', 'date'],
            'date_fin' => ['sometimes', 'nullable', 'date'],
        ]);
        $this->validerPerimetre((int) $validated['role_id'], $validated['unite_id'] ?? null);
        $this->validerDates($validated['date_debut'] ?? null, $validated['date_fin'] ?? null);
        $this->validerUnicite((int) $validated['user_id'], (int) $validated['role_id'], $validated['unite_id'] ?? null);

        $affectation = DB::transaction(function () use ($request, $validated): Affectation {
            $affectation = Affectation::create([...$validated, 'actif' => $validated['actif'] ?? true]);
            $this->audit($request, 'CREATION', 'affectation', $affectation->id, $this->auditData($affectation));

            return $affectation;
        });

        return response()->json(['data' => $this->affectationData($affectation->load(['user', 'role', 'unite']))], 201);
    }

    public function update(Request $request, Affectation $affectation): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => ['sometimes', 'required', 'integer', 'exists:users,id'],
            'role_id' => ['sometimes', 'required', 'integer', 'exists:roles,id'],
            'unite_id' => ['sometimes', 'nullable', 'integer', 'exists:unites,id'],
            'actif' => ['sometimes', 'boolean'],
            'date_debut' => ['sometimes', 'nullable', 'date'],
            'date_fin' => ['sometimes', 'nullable', 'date'],
        ]);

        // Valeurs finales : celles envoyées, sinon celles déjà en base.
        $valeur = fn (string $champ, mixed $actuelle) => array_key_exists($champ, $validated) ? $validated[$champ] : $actuelle;
        $roleId = (int) $valeur('role_id', $affectation->role_id);
        $uniteId = $valeur('unite_id', $affectation->unite_id);
        $perimetreModifie = array_key_exists('role_id', $validated) || array_key_exists('unite_id', $validated);

        $this->validerPerimetre($roleId, $uniteId, $perimetreModifie);
        $this->validerDates(
            $valeur('date_debut', $affectation->date_debut?->toDateTimeString()),
            $valeur('date_fin', $affectation->date_fin?->toDateTimeString()),
        );
        $this->validerUnicite((int) $valeur('user_id', $affectation->user_id), $roleId, $uniteId, $affectation->id);

        $before = $this->auditData($affectation);
        DB::transaction(function () use ($request, $affectation, $validated, $before): void {
            $affectation->fill($validated)->save();
            $this->audit($request, 'MODIFICATION', 'affectation', $affectation->id, ['avant' => $before, 'apres' => $this->auditData($affectation)]);
        });

        return response()->json(['data' => $this->affectationData($affectation->fresh()->load(['user', 'role', 'unite']))]);
    }

    /**
     * Un rôle d'unité exige une unité active ; un rôle global n'en a pas.
     */
    private function validerPerimetre(int $roleId, int|string|null $uniteId, bool $exigerUniteActive = true): void
    {
        $parUnite = in_array(Role::query()->findOrFail($roleId)->code, self::ROLES_PAR_UNITE, true);
        if ($parUnite !== ($uniteId !== null)) {
            throw ValidationException::withMessages(['unite_id' => $parUnite
                ? 'Ce rôle nécessite une affectation à une unité.'
                : 'Ce rôle est global et ne peut pas être rattaché à une unité.']);
        }

        if ($exigerUniteActive) {
            $this->validerUniteActive($uniteId);
        }
    }

    private function validerDates(?string $debut, ?string $fin): void
    {
        if ($debut !== null && $fin !== null && Carbon::parse($fin)->lt(Carbon::parse($debut))) {
            throw ValidationException::withMessages(['date_fin' => 'La date de fin doit être postérieure ou égale à la date de début.']);
        }
    }

    private function validerUnicite(int $userId, int $roleId, int|string|null $uniteId, ?int $saufId = null): void
    {
        $doublon = Affectation::query()
            ->where('user_id', $userId)
            ->where('role_id', $roleId)
            ->where(fn ($query) => $uniteId === null ? $query->whereNull('unite_id') : $query->where('unite_id', $uniteId))
            ->when($saufId, fn ($query) => $query->where('id', '!=', $saufId))
            ->exists();

        if ($doublon) {
            throw ValidationException::withMessages(['role_id' => 'Cette affectation existe déjà pour cet utilisateur, ce rôle et cette unité.']);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function auditData(Affectation $affectation): array
    {
        return $affectation->only(['user_id', 'role_id', 'unite_id', 'actif', 'date_debut', 'date_fin']);
    }
}
