<?php

namespace App\Services;

use App\Enums\StatutAction;
use App\Enums\StatutEtape;
use App\Exceptions\RegleMetierException;
use App\Models\ActionA3;
use App\Models\Controle;
use App\Models\FicheA3;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Cycle de vie des actions (PRD §5.1, §8) : B1 (MOC), motifs obligatoires,
 * création des contrôles à la réalisation et actions correctives après un échec.
 */
class ActionService
{
    public function __construct(
        private readonly ControleEfficaciteService $controles,
        private readonly HistoryLogger $history,
        private readonly NotificationService $notifications,
    ) {}

    /**
     * @param  array{statut: string, motif?: string|null, date_realisation?: string|null}  $data
     */
    public function changerStatut(ActionA3 $action, array $data, ActiveProfile $profile): ActionA3
    {
        return DB::transaction(function () use ($action, $data, $profile): ActionA3 {
            /** @var ActionA3 $action */
            $action = ActionA3::query()->whereKey($action->id)->lockForUpdate()->firstOrFail();
            $fiche = $action->fiche()->firstOrFail();
            $this->exigerDroit($action, $fiche, $profile);

            $actuel = StatutAction::from($action->statut);
            $motif = trim((string) ($data['motif'] ?? ''));
            $cible = $data['statut'] === 'REPRENDRE'
                ? StatutAction::from($action->statut_avant_blocage ?? StatutAction::AFaire->value)
                : StatutAction::from($data['statut']);

            $this->verifierPassage($action, $actuel, $cible, $data['statut'] === 'REPRENDRE', $motif);

            $changes = ['statut' => $cible->value, 'motif_statut' => $cible->exigeMotif() ? $motif : null];
            if ($cible === StatutAction::Bloque) {
                $changes['statut_avant_blocage'] = $actuel->value;
            } elseif ($actuel === StatutAction::Bloque) {
                $changes['statut_avant_blocage'] = null;
            }
            if ($cible === StatutAction::Realise) {
                $changes['date_realisation'] = $this->dateRealisation($data['date_realisation'] ?? null);
            }

            $action->update($changes);
            $this->history->log($fiche, $profile->userId(), 'STATUT_ACTION', 'action_'.$action->id, $actuel->value, $cible->value, $motif ?: null);

            if ($cible === StatutAction::Realise) {
                $this->controles->creerPourAction($action);
            }

            $this->notifications->notify([$fiche->pilote_id, $action->responsable_id], $fiche, 'STATUT_ACTION', 'Action « '.str($action->description)->limit(50).' » : '.$cible->libelle().'.', 'action', $action->id, $profile->userId());

            return $action->refresh();
        });
    }

    /**
     * Enregistre le résultat d'un contrôle disponible (PATCH /controles/{id}).
     * Un résultat non conforme exige une action corrective (B4, §8.4).
     *
     * @param  array{resultat: string, commentaire?: string|null, preuve?: string|null, action_corrective?: array<string, mixed>|null}  $data
     */
    public function enregistrerControle(Controle $controle, array $data, ActiveProfile $profile): Controle
    {
        return DB::transaction(function () use ($controle, $data, $profile): Controle {
            /** @var Controle $controle */
            $controle = Controle::query()->whereKey($controle->id)->lockForUpdate()->firstOrFail();
            $action = $controle->action()->firstOrFail();
            $fiche = $action->fiche()->firstOrFail();

            if (! $profile->is('PILOTE') || $fiche->pilote_id !== $profile->userId()) {
                throw RegleMetierException::interdit('Seul le pilote enregistre un contrôle d’efficacité.');
            }
            if (! in_array($fiche->etape(), [StatutEtape::RealisationActions, StatutEtape::MesureResultats, StatutEtape::VerificationMaintien], true)) {
                throw RegleMetierException::conflit('Les contrôles ne sont pas modifiables à l’étape « '.$fiche->etape()->libelle().' ».');
            }
            if ($controle->resultat !== null) {
                throw RegleMetierException::conflit('Ce contrôle est déjà enregistré.');
            }
            if ($controle->date_echeance->isAfter(today())) {
                throw RegleMetierException::conditionsManquantes('Contrôle pas encore disponible.', ['Le contrôle est disponible à partir du '.$controle->date_echeance->format('d/m/Y').'.']);
            }

            $correctiveId = null;
            if ($data['resultat'] === 'NON_CONFORME') {
                $corrective = $data['action_corrective'] ?? null;
                if (! is_array($corrective) || blank($corrective['description'] ?? null) || blank($corrective['echeance'] ?? null)) {
                    throw RegleMetierException::conditionsManquantes('Action corrective obligatoire.', ['B4 : un contrôle non conforme exige une action corrective (description et échéance).']);
                }

                $correctiveId = ActionA3::create([
                    'fiche_id' => $fiche->id,
                    'cause_id' => $action->cause_id,
                    'action_origine_id' => $action->id,
                    'description' => $corrective['description'],
                    'type_action' => 'CORRECTIVE',
                    'responsable_id' => $corrective['responsable_id'] ?? $fiche->pilote_id,
                    'echeance' => $corrective['echeance'],
                    'cout_estime' => (int) ($corrective['cout_estime'] ?? 0),
                    'statut' => StatutAction::AFaire->value,
                ])->id;
            }

            $controle->update([
                'resultat' => $data['resultat'],
                'commentaire' => $data['commentaire'] ?? null,
                'preuve' => $data['preuve'] ?? null,
                'date_effective' => today()->toDateString(),
                'controleur_id' => $profile->userId(),
                'action_corrective_id' => $correctiveId,
            ]);

            $this->history->log($fiche, $profile->userId(), 'CONTROLE_EFFICACITE', 'controle_'.$controle->id, null, $controle->jalon.' : '.$data['resultat'], $data['commentaire'] ?? null);

            return $controle->refresh();
        });
    }

    private function exigerDroit(ActionA3 $action, FicheA3 $fiche, ActiveProfile $profile): void
    {
        $estPilote = $profile->is('PILOTE') && $fiche->pilote_id === $profile->userId();
        $estResponsable = $profile->is('AGENT', 'PILOTE') && $action->responsable_id === $profile->userId();
        if (! $estPilote && ! $estResponsable) {
            throw RegleMetierException::interdit('Seuls le pilote et le responsable de l’action la mettent à jour.');
        }

        $etapes = $action->action_origine_id !== null
            ? [StatutEtape::RealisationActions, StatutEtape::MesureResultats, StatutEtape::VerificationMaintien]
            : [StatutEtape::RealisationActions];

        if (! in_array($fiche->etape(), $etapes, true)) {
            throw RegleMetierException::conflit('Les actions ne sont pas modifiables à l’étape « '.$fiche->etape()->libelle().' ».');
        }
    }

    private function verifierPassage(ActionA3 $action, StatutAction $actuel, StatutAction $cible, bool $reprise, string $motif): void
    {
        $autorises = match ($actuel) {
            StatutAction::AFaire => [StatutAction::EnCours, StatutAction::Realise, StatutAction::Annule, StatutAction::Bloque],
            StatutAction::EnCours => [StatutAction::Realise, StatutAction::Annule, StatutAction::Bloque],
            StatutAction::Bloque => [StatutAction::Annule],
            default => [],
        };

        if (! $reprise && ! in_array($cible, $autorises, true)) {
            throw RegleMetierException::conflit('Passage impossible de « '.$actuel->libelle().' » à « '.$cible->libelle().' ».');
        }
        if ($reprise && $actuel !== StatutAction::Bloque) {
            throw RegleMetierException::conflit('Seule une action bloquée peut reprendre.');
        }
        if ($cible->exigeMotif() && $motif === '') {
            throw RegleMetierException::conditionsManquantes('Motif obligatoire.', ['Un motif est obligatoire pour annuler ou bloquer une action.']);
        }

        if (in_array($cible, [StatutAction::EnCours, StatutAction::Realise], true)) {
            $manques = $this->manquesB1($action);
            if ($manques !== []) {
                throw RegleMetierException::conditionsManquantes('L’action ne peut pas démarrer.', $manques);
            }
        }
    }

    /**
     * B1 : une action soumise à un MOC ne démarre pas tant que le MOC n'est pas clôturé,
     * avec référence et preuve de clôture.
     *
     * @return array<int, string>
     */
    public function manquesB1(ActionA3 $action): array
    {
        $risque = $action->risque()->first();
        if ($risque === null || ! $risque->moc_requis) {
            return [];
        }

        $manques = [];
        if (blank($risque->moc_reference)) {
            $manques[] = 'B1 : référence du MOC manquante (section 7).';
        }
        if ($risque->moc_statut !== 'CLOTURE') {
            $manques[] = 'B1 : le MOC doit être clôturé (section 7).';
        }
        if (blank($risque->moc_preuve)) {
            $manques[] = 'B1 : preuve de clôture du MOC manquante (section 7).';
        }

        return $manques;
    }

    private function dateRealisation(?string $date): string
    {
        $parsed = $date ? Carbon::parse($date) : today();
        if ($parsed->isAfter(today())) {
            throw RegleMetierException::conditionsManquantes('Date invalide.', ['La date de réalisation ne peut pas être dans le futur.']);
        }

        return $parsed->toDateString();
    }
}
