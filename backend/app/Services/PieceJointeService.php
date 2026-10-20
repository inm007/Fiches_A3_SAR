<?php

namespace App\Services;

use App\Exceptions\RegleMetierException;
use App\Models\ActionA3;
use App\Models\FicheA3;
use App\Models\Parametre;
use App\Models\PieceJointe;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class PieceJointeService
{
    public const array MIME_EXTENSIONS = [
        'application/pdf' => 'pdf',
        'image/png' => 'png',
        'image/jpeg' => 'jpg',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' => 'pptx',
    ];

    public function __construct(private readonly HistoryLogger $history) {}

    /**
     * @return array<string, int>
     */
    public function limites(): array
    {
        return collect(Parametre::fonctionnels())->only(['attachment_max_size_mb', 'attachment_max_files'])->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function pourFiche(FicheA3 $fiche): array
    {
        return $fiche->piecesJointes()
            ->with(['auteur:id,nom,prenom', 'objet'])
            ->orderBy('created_at')
            ->get()
            ->map(fn (PieceJointe $pieceJointe) => $this->presenter($pieceJointe))
            ->all();
    }

    public function ajouter(FicheA3 $fiche, UploadedFile $file, ?ActionA3 $action, ActiveProfile $profile): PieceJointe
    {
        if ($action !== null && $action->fiche_id !== $fiche->id) {
            abort(404, 'Action introuvable.');
        }

        $estPilote = $profile->estPiloteDe($fiche);
        $estResponsable = $profile->is('AGENT', 'PILOTE')
            && $action !== null
            && $action->fiche_id === $fiche->id
            && $action->responsable_id === $profile->userId();

        if (! $estPilote && ! $estResponsable) {
            throw RegleMetierException::interdit('Seul le pilote de la fiche ou le responsable de l’action peut joindre un fichier.');
        }

        if (! $estPilote && $action === null) {
            throw RegleMetierException::interdit('Un responsable d’action doit joindre le fichier à l’une de ses propres actions.');
        }

        $mime = $file->getMimeType();
        $extension = self::MIME_EXTENSIONS[$mime] ?? null;
        if ($extension === null) {
            throw RegleMetierException::conditionsManquantes('Type de fichier non autorisé.', ['Formats acceptés : PDF, PNG, JPEG, DOCX, XLSX et PPTX.']);
        }

        $hash = hash_file('sha256', $file->getRealPath());
        if ($hash === false) {
            throw new RuntimeException('Impossible de calculer l’empreinte de la pièce jointe.');
        }

        $path = null;
        try {
            return DB::transaction(function () use ($fiche, $file, $action, $profile, $mime, $extension, $hash, &$path): PieceJointe {
                $fiche = FicheA3::query()->whereKey($fiche->id)->lockForUpdate()->firstOrFail();
                $limits = $this->limites();
                if ($fiche->piecesJointes()->count() >= $limits['attachment_max_files']) {
                    throw RegleMetierException::conditionsManquantes('Nombre maximal de fichiers atteint.', ['La fiche ne peut pas dépasser '.$limits['attachment_max_files'].' pièces jointes.']);
                }

                $storageName = Str::uuid().'.'.$extension;
                $path = $file->storeAs('pieces-jointes', $storageName, 'local');
                if ($path === false) {
                    throw new RuntimeException('Le stockage privé de la pièce jointe a échoué.');
                }

                $pieceJointe = $fiche->piecesJointes()->create([
                    'objet_type' => $action === null ? null : ActionA3::class,
                    'objet_id' => $action?->id,
                    'nom_origine' => $this->nomOriginal($file->getClientOriginalName()),
                    'nom_stockage' => $path,
                    'type_mime' => $mime,
                    'taille' => $file->getSize(),
                    'empreinte' => $hash,
                    'auteur_id' => $profile->userId(),
                ]);

                $this->history->log(
                    $fiche,
                    $profile->userId(),
                    'PIECE_JOINTE_AJOUTEE',
                    'piece_jointe_'.$pieceJointe->id,
                    null,
                    $pieceJointe->nom_origine,
                );

                return $pieceJointe->load(['auteur:id,nom,prenom', 'objet']);
            });
        } catch (Throwable $exception) {
            if ($path !== null && $path !== false) {
                Storage::disk('local')->delete($path);
            }
            throw $exception;
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function presenter(PieceJointe $pieceJointe): array
    {
        return [
            'id' => $pieceJointe->id,
            'nom' => $pieceJointe->nom_origine,
            'type_mime' => $pieceJointe->type_mime,
            'taille' => (int) $pieceJointe->taille,
            'action' => $pieceJointe->objet instanceof ActionA3 ? $pieceJointe->objet->description : null,
            'auteur' => $pieceJointe->auteur?->nom_complet ?? 'Système',
            'created_at' => $pieceJointe->created_at?->toIso8601String(),
            'download_url' => '/api/pieces-jointes/'.$pieceJointe->id.'/telechargement',
        ];
    }

    private function nomOriginal(string $name): string
    {
        $name = basename(str_replace('\\', '/', $name));
        $name = preg_replace('/[\x00-\x1F\x7F]/', '', $name) ?? '';

        return Str::limit($name === '' ? 'piece-jointe' : $name, 255, '');
    }
}
