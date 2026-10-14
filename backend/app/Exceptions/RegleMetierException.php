<?php

namespace App\Exceptions;

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
     */
    public function __construct(
        string $message,
        public readonly array $manques = [],
        public readonly int $status = 422,
        public readonly string $codeErreur = 'REGLE_METIER',
    ) {
        parent::__construct($message);
    }

    /**
     * @param  array<int, string>  $manques
     */
    public static function conditionsManquantes(string $message, array $manques): self
    {
        return new self($message, $manques, 422, 'CONDITIONS_MANQUANTES');
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
        ]), $this->status);
    }
}
