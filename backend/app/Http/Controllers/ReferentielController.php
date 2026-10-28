<?php

namespace App\Http\Controllers;

use App\Models\Equipement;
use App\Models\JournalAdministration;
use App\Models\Liste;
use App\Models\Unite;
use App\Models\ValeurListe;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Listes de choix actives, unités et équipements pour les formulaires (PRD §4.3).
 * Une liste qui a une valeur « Autre » accepte les options créées depuis la fiche.
 */
class ReferentielController extends Controller
{
    private const array CHAMPS_VALEUR = ['id', 'parent_id', 'code', 'libelle'];

    /** Libellés trop vagues pour une option : ils ne disent rien de plus que « Autre ». */
    private const array LIBELLES_VAGUES = ['autre', 'autres', 'divers', 'na', 'nc', 'inconnu', 'aucun', 'rien', 'test', 'nouveau', 'nouvelle'];

    public function index(): JsonResponse
    {
        return response()->json(['data' => [
            'listes' => Liste::query()
                ->with(['valeurs' => fn ($query) => $query->where('actif', true)->orderBy('ordre')])
                ->get()
                ->mapWithKeys(fn (Liste $liste) => [$liste->code => $liste->valeurs->map->only(self::CHAMPS_VALEUR)->values()]),
            'unites' => Unite::where('actif', true)->orderBy('libelle')->get(['id', 'code', 'libelle']),
            'equipements' => Equipement::where('actif', true)->orderBy('code')->get(['id', 'unite_id', 'code', 'libelle']),
        ]]);
    }

    /**
     * Nouvelle option créée depuis une fiche, rangée sous « Autre » : la mise en forme suit celle des
     * options existantes (majuscule initiale, pas de point final, espaces réduits). Une option qui existe
     * déjà sous « Autre » est renvoyée telle quelle ; un doublon d'une option principale est refusé.
     */
    public function creerAutre(Request $request, Liste $liste): JsonResponse
    {
        $request->validate(['libelle' => ['required', 'string', 'max:255']]);

        $autre = $liste->valeurs()->whereNull('parent_id')->whereIn('code', ValeurListe::CODES_AUTRE)->first();
        if ($autre === null) {
            throw ValidationException::withMessages(['libelle' => 'Cette liste n’a pas d’option « Autre » : demandez l’ajout à l’administrateur fonctionnel.']);
        }

        $libelle = self::mettreEnForme((string) $request->input('libelle'));
        $cle = self::cle($libelle);
        $erreur = match (true) {
            mb_strlen($libelle) < 3 => 'L’option doit compter au moins 3 caractères.',
            mb_strlen($libelle) > 60 => 'L’option doit rester courte : 60 caractères au plus.',
            ! preg_match('/\p{L}/u', $libelle) => 'L’option doit contenir au moins un mot.',
            in_array($cle, array_map(self::cle(...), self::LIBELLES_VAGUES), true) => 'Ce libellé est trop vague : nommez précisément l’option.',
            default => null,
        };
        if ($erreur !== null) {
            throw ValidationException::withMessages(['libelle' => $erreur]);
        }

        $existante = $liste->valeurs()->get()->first(fn (ValeurListe $valeur) => self::cle($valeur->libelle) === $cle);
        if ($existante !== null) {
            if (! $existante->actif) {
                throw ValidationException::withMessages(['libelle' => "L’option « {$existante->libelle} » a été retirée par l’administrateur fonctionnel."]);
            }
            if ($existante->parent_id === null) {
                throw ValidationException::withMessages(['libelle' => "Cette option existe déjà : choisissez « {$existante->libelle} » dans la liste."]);
            }

            return response()->json(['data' => $existante->only(self::CHAMPS_VALEUR), 'existait' => true]);
        }

        $valeur = DB::transaction(function () use ($request, $liste, $autre, $libelle): ValeurListe {
            $valeur = $liste->valeurs()->create([
                'parent_id' => $autre->id,
                'code' => $this->codeLibre($liste, $libelle),
                'libelle' => $libelle,
                'ordre' => ((int) $liste->valeurs()->max('ordre')) + 1,
                'actif' => true,
                'cree_par_id' => $request->user()->id,
            ]);
            JournalAdministration::create([
                'auteur_id' => $request->user()->id,
                'operation' => 'CREATION_DEPUIS_FICHE',
                'objet' => 'valeur_liste:'.$valeur->id,
                'detail' => ['liste' => $liste->code, ...$valeur->only(['code', 'libelle', 'parent_id'])],
                'created_at' => now(),
            ]);

            return $valeur;
        });

        return response()->json(['data' => $valeur->only(self::CHAMPS_VALEUR), 'existait' => false], 201);
    }

    public static function mettreEnForme(string $libelle): string
    {
        $libelle = preg_replace('/\s+/u', ' ', trim($libelle));
        $libelle = preg_replace('/[\s.,;:!?\-–]+$/u', '', $libelle);

        return mb_strtoupper(mb_substr($libelle, 0, 1)).mb_substr($libelle, 1);
    }

    /**
     * Clé de comparaison des doublons : sans accents, casse, ponctuation ni « s » du pluriel.
     */
    public static function cle(string $libelle): string
    {
        $mots = preg_split('/[^a-z0-9]+/', strtolower(Str::ascii($libelle)), -1, PREG_SPLIT_NO_EMPTY);

        return implode('', array_map(fn (string $mot) => strlen($mot) > 3 ? rtrim($mot, 's') : $mot, $mots));
    }

    private function codeLibre(Liste $liste, string $libelle): string
    {
        // Les fiches stockent certains codes sur 50 caractères : la base reste sous 44, suffixe compris.
        $base = trim(substr(trim(strtoupper(preg_replace('/[^A-Za-z0-9]+/', '_', Str::ascii($libelle))), '_'), 0, 44), '_') ?: 'OPTION';
        $code = $base;
        for ($suffixe = 2; $liste->valeurs()->where('code', $code)->exists(); $suffixe++) {
            $code = "{$base}_{$suffixe}";
        }

        return $code;
    }
}
