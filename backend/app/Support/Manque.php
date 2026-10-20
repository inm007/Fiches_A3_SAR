<?php

namespace App\Support;

use JsonSerializable;
use Stringable;

/**
 * Condition manquante accompagnée de l'endroit de la fiche où la corriger. Le code qui écrit
 * le message choisit l'emplacement ; l'écran en fait un bouton « Ouvrir… ». Une simple chaîne
 * reste acceptée partout où un manque est attendu.
 */
final class Manque implements JsonSerializable, Stringable
{
    /**
     * @param  array{type: string, label: string, section?: int, tab?: string, action_id?: int}  $emplacement
     */
    private function __construct(public readonly string $message, public readonly array $emplacement) {}

    public static function section(int $section, string $message): self
    {
        return new self($message, ['type' => 'section', 'section' => $section, 'label' => "Ouvrir la section {$section}"]);
    }

    public static function actions(string $message, ?int $actionId = null): self
    {
        return self::onglet('actions', 'Ouvrir les actions', $message, $actionId);
    }

    public static function controles(string $message, ?int $actionId = null): self
    {
        return self::onglet('controles', 'Ouvrir les contrôles', $message, $actionId);
    }

    public static function validations(string $message): self
    {
        return self::onglet('validations', 'Ouvrir les validations', $message);
    }

    private static function onglet(string $tab, string $label, string $message, ?int $actionId = null): self
    {
        $emplacement = ['type' => 'tab', 'tab' => $tab, 'label' => $label];
        if ($actionId !== null) {
            $emplacement['action_id'] = $actionId;
        }

        return new self($message, $emplacement);
    }

    public function __toString(): string
    {
        return $this->message;
    }

    public function jsonSerialize(): string
    {
        return $this->message;
    }
}
