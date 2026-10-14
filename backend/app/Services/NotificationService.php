<?php

namespace App\Services;

use App\Models\FicheA3;
use App\Models\NotificationInterne;

/**
 * Notifications internes (PRD §9). Pas de courriel : la cloche les lit.
 */
class NotificationService
{
    /**
     * @param  iterable<int|null>  $destinataires
     */
    public function notify(iterable $destinataires, FicheA3 $fiche, string $type, string $message, ?string $cibleType = null, ?int $cibleId = null, ?int $auteurId = null): void
    {
        $envoyes = [];
        foreach ($destinataires as $userId) {
            if ($userId === null || $userId === $auteurId || isset($envoyes[$userId])) {
                continue;
            }

            $envoyes[$userId] = true;
            NotificationInterne::create([
                'user_id' => $userId,
                'fiche_id' => $fiche->id,
                'type' => $type,
                'message' => $fiche->numero_a3.' — '.$message,
                'cible_type' => $cibleType,
                'cible_id' => $cibleId,
            ]);
        }
    }
}
