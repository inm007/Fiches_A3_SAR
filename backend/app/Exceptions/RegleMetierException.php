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
     * @param  array<int, array{index: int, type: string, label: string, section?: int, tab?: string, detail?: string}>  $emplacements
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
     * @param  array<int, string>  $manques
     */
    public static function conditionsManquantes(string $message, array $manques): self
    {
        $emplacements = [];
        foreach ($manques as $index => $manque) {
            $emplacement = self::emplacement($manque);
            if ($emplacement !== null) {
                $emplacements[] = ['index' => $index, ...$emplacement];
            }
        }

        return new self($message, $manques, 422, 'CONDITIONS_MANQUANTES', $emplacements);
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

    /**
     * @return array{type: string, label: string, section?: int, tab?: string, detail?: string}|null
     */
    private static function emplacement(string $manque): ?array
    {
        if (preg_match('/\bSection\s+(\d+)/iu', $manque, $matches) === 1) {
            $section = (int) $matches[1];

            return ['type' => 'section', 'section' => $section, 'label' => "Ouvrir la section {$section}"];
        }

        if (str_starts_with($manque, 'B3 :')) {
            $section = str_contains($manque, 'aucun indicateur principal') ? 3 : 8;

            return ['type' => 'section', 'section' => $section, 'label' => "Ouvrir la section {$section}"];
        }

        if (preg_match('/\bcontrôle\b/iu', $manque) === 1) {
            $emplacement = ['type' => 'tab', 'tab' => 'controles', 'label' => 'Ouvrir les contrôles'];
            if (preg_match('/Action\s+«\s*(.+?)\s*»/u', $manque, $matches) === 1) {
                $emplacement['detail'] = $matches[1];
            }

            return $emplacement;
        }

        if (str_starts_with($manque, 'B1 :') || preg_match('/\baction\b/iu', $manque) === 1) {
            $emplacement = ['type' => 'tab', 'tab' => 'actions', 'label' => 'Ouvrir les actions'];
            if (preg_match('/Action\s+«\s*(.+?)\s*»/u', $manque, $matches) === 1) {
                $emplacement['detail'] = $matches[1];
            }

            return $emplacement;
        }

        if (preg_match('/gain\(s\).*valider|commentaire.*obligatoire|B8/iu', $manque) === 1) {
            return ['type' => 'tab', 'tab' => 'validations', 'label' => 'Ouvrir les validations'];
        }

        return null;
    }
}
