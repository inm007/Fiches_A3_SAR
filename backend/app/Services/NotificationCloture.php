<?php

namespace App\Services;

use App\Enums\StatutAction;
use App\Models\ActionA3;
use App\Models\Controle;
use App\Models\FicheA3;
use App\Models\NotificationInterne;
use App\Models\Validation;
use Illuminate\Support\Collection;

/**
 * Une notification qui demandait quelque chose n'a plus lieu d'être quand la chose est faite :
 * la demande de validation décidée, l'action terminée, le contrôle enregistré, le pilote désigné.
 * On la marque lue et traitée, pour que la cloche ne compte que ce qui attend encore.
 */
class NotificationCloture
{
    /** Types dont la demande se referme d'elle-même, par type de cible. */
    private const CIBLES = ['validation' => Validation::class, 'action' => ActionA3::class, 'controle' => Controle::class];

    public function marquerTraitees(int $userId): void
    {
        $enAttente = NotificationInterne::query()
            ->where('user_id', $userId)
            ->whereNull('lu_le')
            ->get(['id', 'type', 'fiche_id', 'cible_type', 'cible_id']);

        $traitees = $this->idsTraitees($enAttente);

        if ($traitees->isNotEmpty()) {
            NotificationInterne::query()->whereIn('id', $traitees)->update(['lu_le' => now(), 'traite_le' => now()]);
        }
    }

    /**
     * @param  Collection<int, NotificationInterne>  $notifications
     * @return Collection<int, int>
     */
    private function idsTraitees(Collection $notifications): Collection
    {
        $faites = collect(self::CIBLES)->flatMap(function (string $modele, string $cible) use ($notifications): array {
            $ids = $notifications->where('cible_type', $cible)->pluck('cible_id')->filter()->unique();

            if ($ids->isEmpty()) {
                return [];
            }

            $query = $modele::query()->whereIn('id', $ids);
            $terminees = match ($cible) {
                'validation' => $query->where('decision', '!=', 'EN_ATTENTE'),
                'action' => $query->whereIn('statut', StatutAction::terminees()),
                default => $query->whereNotNull('resultat'),
            };

            return $terminees->pluck('id')->map(fn (int $id) => $cible.':'.$id)->all();
        })->flip();

        // « Désignez un pilote » : la demande est satisfaite dès qu'un pilote est en place.
        $pourvues = $notifications->where('type', 'PILOTE_A_DESIGNER')->pluck('fiche_id')->filter()->unique();
        $pourvues = $pourvues->isEmpty()
            ? collect()
            : FicheA3::query()->whereIn('id', $pourvues)->whereNotNull('pilote_id')->pluck('id')->flip();

        return $notifications->filter(fn (NotificationInterne $notification) => $notification->type === 'PILOTE_A_DESIGNER'
            ? $pourvues->has($notification->fiche_id)
            : $faites->has($notification->cible_type.':'.$notification->cible_id))
            ->pluck('id');
    }
}
