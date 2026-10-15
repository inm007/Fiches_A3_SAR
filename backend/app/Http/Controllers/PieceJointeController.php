<?php

namespace App\Http\Controllers;

use App\Models\ActionA3;
use App\Models\FicheA3;
use App\Models\PieceJointe;
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
                'mimetypes:application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'max:'.($limits['attachment_max_size_mb'] * 1024),
            ],
            'action_id' => ['nullable', 'integer', 'exists:actions,id'],
        ]);

        $action = isset($data['action_id']) ? ActionA3::findOrFail($data['action_id']) : null;
        $pieceJointe = $attachments->ajouter($fiche, $data['fichier'], $action, $profile);

        return response()->json(['data' => $attachments->presenter($pieceJointe)], 201);
    }

    public function download(PieceJointe $pieceJointe, ActiveProfile $profile): StreamedResponse
    {
        $this->visible($pieceJointe->fiche, $profile);

        if (! Storage::disk('local')->exists($pieceJointe->nom_stockage)) {
            abort(404, 'Fichier introuvable.');
        }

        $filename = basename(str_replace('\\', '/', $pieceJointe->nom_origine));
        $filename = substr(preg_replace('/[\x00-\x1F\x7F]/', '', $filename) ?? '', 0, 255);
        $filename = $filename === '' ? 'piece-jointe' : $filename;

        return Storage::disk('local')->download($pieceJointe->nom_stockage, $filename, [
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
