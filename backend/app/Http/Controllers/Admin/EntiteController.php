<?php

namespace App\Http\Controllers\Admin;

use App\Models\Entite;
use App\Services\Organigramme;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Écran Organigramme : directions, départements et services, avec leur responsable.
 * Le responsable d'un département reçoit le profil Chef de département et valide la
 * pertinence des fiches déclarées par les personnes rattachées à son département.
 * Rien n'est supprimé : une entité se désactive.
 */
class EntiteController extends AdminController
{
    private const array CHAMPS = ['code', 'libelle', 'type', 'parent_id', 'responsable_id', 'actif'];

    public function __construct(private readonly Organigramme $organigramme) {}

    public function index(): JsonResponse
    {
        $entites = Entite::query()
            ->with(['parent:id,libelle', 'responsable:id,nom,prenom'])
            ->withCount('membres')
            ->orderBy('libelle')
            ->get();

        return response()->json(['data' => $entites->map(fn (Entite $entite) => $this->data($entite))]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:255', 'unique:entites,code'],
            'libelle' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(Entite::TYPES)],
            'parent_id' => ['nullable', 'integer', 'exists:entites,id'],
            'responsable_id' => ['nullable', 'integer', Rule::exists('users', 'id')->where('actif', true)],
            'actif' => ['sometimes', 'boolean'],
        ]);
        $this->validerParent($validated['type'], $validated['parent_id'] ?? null, null);

        $entite = DB::transaction(function () use ($request, $validated): Entite {
            $entite = Entite::create([...$validated, 'actif' => $validated['actif'] ?? true]);
            $this->audit($request, 'CREATION', 'entite', $entite->id, $entite->only(self::CHAMPS));
            $this->organigramme->synchroniserChefs();

            return $entite;
        });

        return response()->json(['data' => $this->data($entite->load(['parent', 'responsable'])->loadCount('membres'))], 201);
    }

    public function update(Request $request, Entite $entite): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('entites', 'code')->ignore($entite->id)],
            'libelle' => ['sometimes', 'required', 'string', 'max:255'],
            'type' => ['sometimes', 'required', Rule::in(Entite::TYPES)],
            'parent_id' => ['sometimes', 'nullable', 'integer', 'exists:entites,id'],
            'responsable_id' => ['sometimes', 'nullable', 'integer', Rule::exists('users', 'id')->where('actif', true)],
            'actif' => ['sometimes', 'boolean'],
        ]);
        $type = $validated['type'] ?? $entite->type;
        $parentId = array_key_exists('parent_id', $validated) ? $validated['parent_id'] : $entite->parent_id;
        $this->validerParent($type, $parentId, $entite);
        if ($type !== $entite->type && $entite->enfants()->exists()) {
            throw ValidationException::withMessages(['type' => 'Cette entité a des entités rattachées : changez-les d’abord de parent.']);
        }
        $before = $entite->only(self::CHAMPS);

        DB::transaction(function () use ($request, $entite, $validated, $before): void {
            $entite->fill($validated)->save();
            $this->audit($request, 'MODIFICATION', 'entite', $entite->id, ['avant' => $before, 'apres' => $entite->only(self::CHAMPS)]);
            $this->organigramme->synchroniserChefs();
        });

        return response()->json(['data' => $this->data($entite->fresh()->load(['parent', 'responsable'])->loadCount('membres'))]);
    }

    /**
     * Une direction est à la racine, un département sous une direction, un service sous un département.
     */
    private function validerParent(string $type, int|string|null $parentId, ?Entite $entite): void
    {
        $attendu = Entite::PARENT_ATTENDU[$type];
        $parent = $parentId === null ? null : Entite::find($parentId);

        if ($attendu === null && $parent !== null) {
            throw ValidationException::withMessages(['parent_id' => 'Une direction n’a pas d’entité parente.']);
        }
        if ($attendu !== null && $parent?->type !== $attendu) {
            throw ValidationException::withMessages(['parent_id' => $type === 'DEPARTEMENT'
                ? 'Un département se rattache à une direction.'
                : 'Un service se rattache à un département.']);
        }
        if ($entite !== null && $parent?->id === $entite->id) {
            throw ValidationException::withMessages(['parent_id' => 'Une entité ne peut pas être son propre parent.']);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function data(Entite $entite): array
    {
        return [
            ...$entite->only(['id', ...self::CHAMPS]),
            'parent' => $entite->parent?->libelle,
            'responsable' => $entite->responsable?->nom_complet,
            'membres_count' => $entite->membres_count ?? 0,
        ];
    }
}
