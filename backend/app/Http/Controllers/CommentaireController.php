<?php

namespace App\Http\Controllers;

use App\Exceptions\RegleMetierException;
use App\Http\Controllers\Concerns\ResolvesVisibleFiche;
use App\Models\ActionA3;
use App\Models\Commentaire;
use App\Models\FicheA3;
use App\Models\Validation;
use App\Services\ActiveProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Commentaires de la fiche, d'une de ses actions ou d'une de ses validations (PRD §4.4).
 * L'administrateur fonctionnel ne commente pas.
 */
class CommentaireController extends Controller
{
    use ResolvesVisibleFiche;

    public function index(FicheA3 $fiche, ActiveProfile $profile): JsonResponse
    {
        $this->visible($fiche, $profile);

        $cibles = $this->cibles($fiche);

        return response()->json(['data' => $fiche->commentaires()
            ->with('auteur:id,nom,prenom')
            ->orderBy('created_at')
            ->get()
            ->map(fn (Commentaire $commentaire) => $this->present($commentaire, $cibles))]);
    }

    public function store(Request $request, FicheA3 $fiche, ActiveProfile $profile): JsonResponse
    {
        $this->visible($fiche, $profile);
        if (! $profile->peutCommenter()) {
            throw RegleMetierException::interdit('Ce profil ne peut pas commenter une fiche.');
        }

        $data = $request->validate([
            'texte' => ['required', 'string', 'max:2000'],
            'contexte' => ['nullable', Rule::in(['FICHE', 'VALIDATION', 'ACTION'])],
            'objet_id' => ['nullable', 'integer', 'required_if:contexte,VALIDATION,ACTION'],
        ]);
        $contexte = $data['contexte'] ?? 'FICHE';
        $objetId = $contexte === 'FICHE' ? null : (int) $data['objet_id'];
        $cibles = $this->cibles($fiche);
        if ($objetId !== null && ! isset($cibles[$contexte.':'.$objetId])) {
            throw ValidationException::withMessages(['objet_id' => 'Cet élément n’appartient pas à la fiche.']);
        }

        $commentaire = $fiche->commentaires()->create([
            'auteur_id' => $profile->userId(),
            'contexte' => $contexte,
            'objet_id' => $objetId,
            'texte' => $data['texte'],
        ]);

        return response()->json(['data' => $this->present($commentaire->load('auteur:id,nom,prenom'), $cibles)], 201);
    }

    /**
     * Libellé de chaque action et validation de la fiche, indexé par « CONTEXTE:id ».
     *
     * @return array<string, string>
     */
    private function cibles(FicheA3 $fiche): array
    {
        $actions = $fiche->actions()->orderBy('id')->get(['id', 'description'])
            ->mapWithKeys(fn (ActionA3 $action) => ['ACTION:'.$action->id => 'Action « '.str($action->description)->limit(60).' »']);
        $validations = $fiche->validations()->with('role:id,libelle')->orderBy('id')->get(['id', 'porte', 'role_id'])
            ->mapWithKeys(fn (Validation $validation) => ['VALIDATION:'.$validation->id => 'Validation porte '.$validation->porte.' — '.$validation->role?->libelle]);

        return [...$actions->all(), ...$validations->all()];
    }

    /**
     * @param  array<string, string>  $cibles
     * @return array<string, mixed>
     */
    private function present(Commentaire $commentaire, array $cibles): array
    {
        return [
            'id' => $commentaire->id,
            'texte' => $commentaire->texte,
            'contexte' => $commentaire->contexte,
            'objet_id' => $commentaire->objet_id,
            'cible' => $commentaire->objet_id === null ? null : ($cibles[$commentaire->contexte.':'.$commentaire->objet_id] ?? null),
            'auteur' => $commentaire->auteur?->nom_complet ?? 'Système',
            'created_at' => $commentaire->created_at?->toIso8601String(),
        ];
    }
}
