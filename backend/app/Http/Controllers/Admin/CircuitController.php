<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Domaine;
use App\Models\DomaineRole;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Écran Circuit de validation : pour chaque domaine coché en section 7, les directeurs
 * sollicités en même temps à la porte 1. Tous doivent approuver le plan. « Autres » n'a
 * pas de correspondance : le pilote choisit le directeur sur la fiche.
 */
class CircuitController extends AdminController
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => $this->etat()]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'domaines' => ['required', 'array'],
            'domaines.*.domaine' => ['required', Rule::enum(Domaine::class), 'distinct'],
            'domaines.*.roles' => ['present', 'array'],
            'domaines.*.roles.*' => ['string', Rule::in(Domaine::rolesValideurs())],
        ]);

        $roles = Role::query()->whereIn('code', Domaine::rolesValideurs())->pluck('id', 'code');
        $avant = DomaineRole::correspondance();

        DB::transaction(function () use ($request, $validated, $roles, $avant): void {
            foreach ($validated['domaines'] as $ligne) {
                if ($ligne['domaine'] === Domaine::Autres->value) {
                    continue;
                }
                if ($ligne['roles'] === []) {
                    throw ValidationException::withMessages(['domaines' => 'Chaque domaine doit solliciter au moins un directeur.']);
                }
                DomaineRole::query()->where('domaine', $ligne['domaine'])->delete();
                foreach (array_unique($ligne['roles']) as $code) {
                    DomaineRole::create(['domaine' => $ligne['domaine'], 'role_id' => $roles[$code]]);
                }
            }
            $this->audit($request, 'MODIFICATION', 'circuit_validation', null, ['avant' => $avant, 'apres' => DomaineRole::correspondance()]);
        });

        return response()->json(['data' => $this->etat()]);
    }

    /**
     * @return array<string, mixed>
     */
    private function etat(): array
    {
        $correspondance = DomaineRole::correspondance();

        return [
            'domaines' => collect(Domaine::cases())->map(fn (Domaine $domaine) => [
                'domaine' => $domaine->value,
                'libelle' => $domaine->libelle(),
                'roles' => $correspondance[$domaine->value],
                'choisi_sur_la_fiche' => $domaine === Domaine::Autres,
            ])->values(),
            'directeurs' => Role::query()->whereIn('code', Domaine::rolesValideurs())->orderBy('id')->get(['code', 'libelle']),
        ];
    }
}
