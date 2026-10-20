<?php

namespace App\Exceptions;

use App\Support\Manque;
use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * Garde métier non satisfaite (422, liste des manques), conflit d'état (409) ou opération
 * interdite (403), conformément au TRD §7.3 et §10.
 *
 * Convention du backend : un champ de formulaire invalide passe par la validation Laravel
 * (ValidationException, erreurs par champ) ; toute autre règle métier passe par cette exception.
 */
class RegleMetierException extends RuntimeException
{
    /**
     * @param  array<int, string>  $manques
     * @param  array<int, array{index: int, type: string, label: string, section?: int, tab?: string, action_id?: int}>  $emplacements
     */
    public function __construct(
        string $message,
        public readonly array $manques = [],
        public readonly int $status = 422,
        public readonly string $codeErreur = 'REGLE_METIER',
        public readonly array $emplacements = [],
    ) {
        parent::__construct($message);
    }

    /**
     * @param  array<int, string|Manque>  $manques
     */
    public static function conditionsManquantes(string $message, array $manques): self
    {
        $manques = array_values($manques);
        $emplacements = [];
        foreach ($manques as $index => $manque) {
            if ($manque instanceof Manque) {
                $emplacements[] = ['index' => $index, ...$manque->emplacement];
            }
        }

        return new self($message, array_map('strval', $manques), 422, 'CONDITIONS_MANQUANTES', $emplacements);
    }

    public static function conflit(string $message = 'La fiche a changé entre-temps. Rechargez-la.'): self
    {
        return new self($message, [], 409, 'CONFLIT');
    }

    public static function interdit(string $message = 'Opération non autorisée pour le profil actif.'): self
    {
        return new self($message, [], 403, 'INTERDIT');
    }

    public function render(): JsonResponse
    {
        return response()->json(array_filter([
            'message' => $this->getMessage(),
            'code' => $this->codeErreur,
            'manques' => $this->manques ?: null,
            'emplacements' => $this->emplacements ?: null,
        ]), $this->status);
    }
}
