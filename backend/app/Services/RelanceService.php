<?php

namespace App\Services;

use App\Enums\StatutAction;
use App\Enums\StatutEtape;
use App\Exceptions\RegleMetierException;
use App\Models\ActionA3;
use App\Models\Affectation;
use App\Models\FicheA3;
use App\Models\Parametre;
use App\Models\Relance;
use App\Models\User;
use App\Models\Validation;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

/**
 * Relances (PRD §9) : manuelles depuis la fiche, automatiques par la commande a3:relances.
 * Une cible est une action en retard ou une validation en attente ; au plus une relance
 * par 24 heures et par cible.
 */
class RelanceService
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly HistoryLogger $history,
        private readonly ValidationCircuit $circuit,
    ) {}

    /**
     * Pilote de la fiche, Direction et administrateur fonctionnel.
     */
    public function peutRelancer(FicheA3 $fiche, ActiveProfile $profile): bool
    {
        return $profile->estPiloteDe($fiche) || $profile->is('DIRECTION', 'ADMIN_FONCTIONNEL');
    }

    public function actionEnRetard(ActionA3 $action, FicheA3 $fiche): bool
    {
        return ! StatutAction::from($action->statut)->estTerminee()
            && $action->echeance?->isBefore(today())
            && $fiche->etape()->estActive();
    }

    public function validationEnAttente(Validation $validation, FicheA3 $fiche): bool
    {
        return $this->circuit->estActionnable($validation, $fiche);
    }

    public function relancer(ActionA3|Validation $cible, ActiveProfile $profile): Relance
    {
        $fiche = $cible->fiche;
        if (! $this->peutRelancer($fiche, $profile)) {
            throw RegleMetierException::interdit('Seuls le pilote de la fiche, la Direction et l’administrateur fonctionnel peuvent relancer.');
        }

        $relancable = $cible instanceof ActionA3 ? $this->actionEnRetard($cible, $fiche) : $this->validationEnAttente($cible, $fiche);
        if (! $relancable) {
            throw RegleMetierException::conditionsManquantes('Relance impossible.', [
                $cible instanceof ActionA3 ? 'Seule une action en retard peut être relancée.' : 'Seule une validation en attente peut être relancée.',
            ]);
        }

        $relance = $this->enregistrer($cible, $fiche, 'MANUELLE', $profile->userId());
        if ($relance === null) {
            throw new RegleMetierException('Déjà relancé il y a moins de 24 h.', [], 429, 'TROP_DE_RELANCES');
        }

        return $relance;
    }

    /**
     * Rappels automatiques : une fois tous les « reminder_interval_days » jours tant que
     * l'élément est en retard ou en attente, et que le destinataire a encore accès.
     *
     * @return int nombre de relances créées
     */
    public function rappels(): int
    {
        $parametres = Parametre::fonctionnels();
        $intervalle = (int) $parametres['reminder_interval_days'];
        $creees = 0;

        $actions = ActionA3::query()
            ->with('fiche')
            ->whereNotIn('statut', StatutAction::terminees())
            ->whereDate('echeance', '<', today())
            ->whereHas('fiche', fn (Builder $fiche) => $fiche->whereNotIn('statut_etape', [StatutEtape::EnAttente->value, StatutEtape::Cloture->value]))
            ->get();
        foreach ($actions as $action) {
            if ($this->rappelDu($action, $action->echeance->copy()->addDay(), $intervalle)
                && $this->aAcces($action->responsable_id)
                && $this->enregistrer($action, $action->fiche, 'AUTOMATIQUE', null) !== null) {
                $creees++;
            }
        }

        if (! $parametres['validation_reminders_enabled']) {
            return $creees;
        }

        $validations = Validation::query()->with('fiche')->where('decision', 'EN_ATTENTE')->get();
        foreach ($validations as $validation) {
            if ($this->validationEnAttente($validation, $validation->fiche)
                && $this->rappelDu($validation, $validation->demandee_le?->copy()->addDays($intervalle), $intervalle)
                && $this->aAcces($validation->valideur_id, $validation->role_id)
                && $this->enregistrer($validation, $validation->fiche, 'AUTOMATIQUE', null) !== null) {
                $creees++;
            }
        }

        return $creees;
    }

    /**
     * Dernière relance de la cible, pour l'affichage et la règle des 24 heures.
     */
    public function derniere(ActionA3|Validation $cible): ?Relance
    {
        return Relance::query()
            ->where('cible_type', $cible::class)
            ->where('cible_id', $cible->id)
            ->latest('id')
            ->first();
    }

    /**
     * Premier rappel à la date donnée (lendemain de l'échéance d'une action, « intervalle »
     * jours après la demande de validation), puis tous les « intervalle » jours.
     */
    private function rappelDu(ActionA3|Validation $cible, ?CarbonInterface $premier, int $intervalle): bool
    {
        $derniere = $this->derniere($cible)?->created_at;
        $du = $derniere?->copy()->addDays($intervalle) ?? $premier;

        return $du !== null && ! $du->copy()->startOfDay()->isAfter(today());
    }

    /**
     * Le destinataire est actif et garde une affectation en cours (du rôle demandé, le cas échéant).
     */
    private function aAcces(?int $userId, ?int $roleId = null): bool
    {
        return $userId !== null
            && User::query()->whereKey($userId)->where('actif', true)->exists()
            && Affectation::query()->where('user_id', $userId)->enCours()
                ->when($roleId !== null, fn (Builder $query) => $query->where('role_id', $roleId))
                ->exists();
    }

    /**
     * Crée la relance, la notification et la ligne d'historique, sauf si la cible
     * a déjà été relancée dans les 24 dernières heures (null).
     */
    private function enregistrer(ActionA3|Validation $cible, FicheA3 $fiche, string $mode, ?int $auteurId): ?Relance
    {
        if (Relance::query()->where('cible_type', $cible::class)->where('cible_id', $cible->id)->where('created_at', '>', now()->subDay())->exists()) {
            return null;
        }

        [$destinataire, $copies, $message] = $cible instanceof ActionA3
            ? [$cible->responsable_id, [$fiche->pilote_id], 'Relance : action « '.str($cible->description)->limit(50).' » en retard (échéance du '.$cible->echeance->format('d/m/Y').').']
            : [$cible->valideur_id, [], 'Relance : validation « '.$cible->role()->value('libelle').' » en attente depuis le '.$cible->demandee_le->format('d/m/Y').'.'];

        try {
            return DB::transaction(function () use ($cible, $fiche, $mode, $auteurId, $destinataire, $copies, $message): Relance {
                $relance = Relance::create([
                    'cible_type' => $cible::class,
                    'cible_id' => $cible->id,
                    'auteur_id' => $auteurId,
                    'destinataire_id' => $destinataire,
                    'jour' => today(),
                    'mode' => $mode,
                ]);
                $type = $cible instanceof ActionA3 ? 'action' : 'validation';
                $this->notifications->notify([$destinataire, ...$copies], $fiche, 'RELANCE', $message, $type, $cible->id, $auteurId);
                $this->history->log($fiche, $auteurId, 'RELANCE', $type.'_'.$cible->id, null, null, $message);

                return $relance;
            });
        } catch (QueryException $exception) {
            // Contrainte unique (cible, jour) : une autre relance vient d'être créée.
            if ($exception->getCode() === '23505') {
                return null;
            }

            throw $exception;
        }
    }
}
