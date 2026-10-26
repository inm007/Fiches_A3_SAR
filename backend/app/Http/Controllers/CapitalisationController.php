<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\PagineEtRecherche;
use App\Models\FicheA3;
use App\Models\Lecon;
use App\Models\Perennisation;
use App\Models\ValeurListe;
use App\Services\ActiveProfile;
use App\Services\FicheVisibility;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Capitalisation (sujet P13) : les leçons apprises et les standards mis en place, toutes fiches
 * confondues, pour retrouver ce qui a déjà marché avant de repartir de zéro. Seules les fiches
 * visibles par le profil actif y contribuent ; un standard n'y figure qu'une fois réalisé.
 */
class CapitalisationController extends Controller
{
    use PagineEtRecherche;

    public function index(Request $request, ActiveProfile $profile, FicheVisibility $visibility): JsonResponse
    {
        $filters = $request->validate([
            'vue' => ['nullable', Rule::in(['lecons', 'standards'])],
            'q' => ['nullable', 'string', 'max:100'],
            'rubrique' => ['nullable', 'string', 'max:50'],
            'unite_id' => ['nullable', 'integer'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $fichesVisibles = $visibility->apply(FicheA3::query(), $profile)
            ->when($filters['unite_id'] ?? null, fn (Builder $q, $uniteId) => $q->where('unite_id', $uniteId))
            ->select('id');
        $standards = ($filters['vue'] ?? 'lecons') === 'standards';
        $champTexte = $standards ? 'preuve' : 'texte';

        $query = ($standards ? Perennisation::query()->where('statut', 'REALISE') : Lecon::query())
            ->whereIn('fiche_id', $fichesVisibles)
            ->when($filters['rubrique'] ?? null, fn (Builder $q, $rubrique) => $q->where($standards ? 'type' : 'rubrique', $rubrique))
            ->with(['fiche:id,numero_a3,titre,unite_id,equipement_id,statut_etape', 'fiche.unite:id,libelle', 'fiche.equipement:id,code,libelle']);

        $this->rechercherMots($query, $filters['q'] ?? null, fn (Builder $search, string $motif) => $search
            ->where($champTexte, 'ilike', $motif)
            ->orWhereHas('fiche', fn (Builder $fiche) => $fiche->where('numero_a3', 'ilike', $motif)
                ->orWhere('titre', 'ilike', $motif)
                ->orWhereHas('equipement', fn (Builder $equipement) => $equipement->where('code', 'ilike', $motif)->orWhere('libelle', 'ilike', $motif))));

        $page = $query->orderByDesc('updated_at')->orderByDesc('id')->paginate($filters['per_page'] ?? 20);
        $types = $standards
            ? ValeurListe::query()->deLaListe('type_perennisation')->pluck('libelle', 'code')
            : collect();

        return response()->json([
            'data' => collect($page->items())->map(fn (Lecon|Perennisation $element) => [
                'id' => $element->id,
                'rubrique' => $standards ? $element->type : $element->rubrique,
                'libelle' => $standards ? ($types[$element->type] ?? $element->type) : null,
                'texte' => $element->{$champTexte},
                'date' => ($standards ? $element->date : null)?->toDateString() ?? $element->updated_at->toDateString(),
                'fiche' => [
                    'id' => $element->fiche->id,
                    'numero_a3' => $element->fiche->numero_a3,
                    'titre' => $element->fiche->titre,
                    'statut_etape' => $element->fiche->statut_etape,
                    'unite' => $element->fiche->unite?->libelle,
                    'equipement' => $element->fiche->equipement ? trim($element->fiche->equipement->code.' — '.$element->fiche->equipement->libelle, ' —') : null,
                ],
            ])->all(),
            'meta' => $this->metaPagination($page),
        ]);
    }
}
