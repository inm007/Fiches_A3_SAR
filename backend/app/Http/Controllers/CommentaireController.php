<?php

namespace App\Http\Controllers;

use App\Exceptions\RegleMetierException;
use App\Models\Commentaire;
use App\Models\FicheA3;
use App\Services\ActiveProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Commentaires généraux de la fiche (PRD §4.4). L'administrateur fonctionnel ne commente pas.
 */
class CommentaireController extends Controller
{
    use ResolvesVisibleFiche;

    public function index(FicheA3 $fiche, ActiveProfile $profile): JsonResponse
    {
        $this->visible($fiche, $profile);

        return response()->json(['data' => $fiche->commentaires()
            ->with('auteur:id,nom,prenom')
            ->orderBy('created_at')
            ->get()
            ->map(fn (Commentaire $commentaire) => $this->present($commentaire))]);
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
            'objet_id' => ['nullable', 'integer'],
        ]);

        $commentaire = $fiche->commentaires()->create([
            'auteur_id' => $profile->userId(),
            'contexte' => $data['contexte'] ?? 'FICHE',
            'objet_id' => $data['objet_id'] ?? null,
            'texte' => $data['texte'],
        ]);

        return response()->json(['data' => $this->present($commentaire->load('auteur:id,nom,prenom'))], 201);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(Commentaire $commentaire): array
    {
        return [
            'id' => $commentaire->id,
            'texte' => $commentaire->texte,
            'contexte' => $commentaire->contexte,
            'objet_id' => $commentaire->objet_id,
            'auteur' => $commentaire->auteur?->nom_complet ?? 'Système',
            'created_at' => $commentaire->created_at?->toIso8601String(),
        ];
    }
}
