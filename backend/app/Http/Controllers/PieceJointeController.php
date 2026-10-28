<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesVisibleFiche;
use App\Models\ActionA3;
use App\Models\Cause;
use App\Models\Controle;
use App\Models\FicheA3;
use App\Models\Perennisation;
use App\Models\PieceJointe;
use App\Models\Risque;
use App\Services\ActiveProfile;
use App\Services\PieceJointeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PieceJointeController extends Controller
{
    use ResolvesVisibleFiche;

    public function index(FicheA3 $fiche, ActiveProfile $profile, PieceJointeService $attachments): JsonResponse
    {
        $this->visible($fiche, $profile);

        return response()->json([
            'data' => $attachments->pourFiche($fiche),
            'meta' => $attachments->limites(),
        ]);
    }

    public function store(Request $request, FicheA3 $fiche, ActiveProfile $profile, PieceJointeService $attachments): JsonResponse
    {
        $this->visible($fiche, $profile);

        $limits = $attachments->limites();
        $data = $request->validate([
            'fichier' => [
                'required',
                'file',
                'mimetypes:'.implode(',', array_keys(PieceJointeService::MIME_EXTENSIONS)),
                'max:'.($limits['attachment_max_size_mb'] * 1024),
            ],
            // Une preuve se rattache à une seule ligne : action, pérennisation, cause, risque (MOC) ou contrôle.
            'action_id' => ['nullable', 'integer', 'exists:actions,id', 'prohibits:perennisation_id,cause_id,risque_id,controle_id'],
            'perennisation_id' => ['nullable', 'integer', 'exists:perennisation,id', 'prohibits:action_id,cause_id,risque_id,controle_id'],
            'cause_id' => ['nullable', 'integer', 'exists:causes,id', 'prohibits:action_id,perennisation_id,risque_id,controle_id'],
            'risque_id' => ['nullable', 'integer', 'exists:risques,id', 'prohibits:action_id,perennisation_id,cause_id,controle_id'],
            'controle_id' => ['nullable', 'integer', 'exists:controles,id', 'prohibits:action_id,perennisation_id,cause_id,risque_id'],
        ]);

        $objet = match (true) {
            isset($data['action_id']) => ActionA3::findOrFail($data['action_id']),
            isset($data['perennisation_id']) => Perennisation::findOrFail($data['perennisation_id']),
            isset($data['cause_id']) => Cause::findOrFail($data['cause_id']),
            isset($data['risque_id']) => Risque::findOrFail($data['risque_id']),
            isset($data['controle_id']) => Controle::findOrFail($data['controle_id']),
            default => null,
        };
        $pieceJointe = $attachments->ajouter($fiche, $data['fichier'], $objet, $profile);

        return response()->json(['data' => $attachments->presenter($pieceJointe)], 201);
    }

    public function download(PieceJointe $pieceJointe, ActiveProfile $profile): StreamedResponse
    {
        $this->visible($pieceJointe->fiche, $profile);

        if (! Storage::disk('local')->exists($pieceJointe->nom_stockage)) {
            abort(404, 'Fichier introuvable.');
        }

        // Le nom d'origine est nettoyé à l'enregistrement (PieceJointeService::nomOriginal).
        return Storage::disk('local')->download($pieceJointe->nom_stockage, $pieceJointe->nom_origine, [
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
