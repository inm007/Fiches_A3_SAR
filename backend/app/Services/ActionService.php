<?php

namespace App\Services;

use App\Enums\StatutAction;
use App\Enums\StatutEtape;
use App\Exceptions\RegleMetierException;
use App\Models\ActionA3;
use App\Models\Controle;
use App\Models\FicheA3;
use App\Models\ValeurListe;
use App\Support\Manque;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Cycle de vie des actions (PRD §5.1, §8) : B1 (MOC), motifs obligatoires,
 * création des contrôles à la réalisation et actions correctives après un échec.
 * Pendant le suivi, le pilote reporte une échéance, change un responsable ou ajoute
 * une action sans repasser par une nouvelle boucle ; chaque changement est motivé et tracé.
 */
class ActionService
{
    public function __construct(
        private readonly ControleEfficaciteService $controles,
        private readonly HistoryLogger $history,
        private readonly NotificationService $notifications,
    ) {}

    /**
     * @param  array{statut: string, motif?: string|null, date_realisation?: string|null, preuve?: string|null}  $data
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
                // Preuve facultative : une référence écrite et/ou un fichier joint à l'action.
                $preuve = trim((string) ($data['preuve'] ?? ''));
                $changes['date_realisation'] = $this->dateRealisation($data['date_realisation'] ?? null);
                $changes['preuve_realisation'] = $preuve === '' ? null : $preuve;
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
     * Report d'échéance ou changement de responsable d'une action en cours de suivi (pilote).
     *
     * @param  array{echeance?: string|null, responsable_id?: int|null, motif: string}  $data
     */
    public function modifier(ActionA3 $action, array $data, ActiveProfile $profile): ActionA3
    {
        return DB::transaction(function () use ($action, $data, $profile): ActionA3 {
            /** @var ActionA3 $action */
            $action = ActionA3::query()->whereKey($action->id)->lockForUpdate()->firstOrFail();
            $fiche = $action->fiche()->firstOrFail();

            if (! $profile->estPiloteDe($fiche)) {
                throw RegleMetierException::interdit('Seul le pilote reporte une échéance ou change le responsable d’une action.');
            }
            if (! $this->etapePermise($action, $fiche)) {
                throw RegleMetierException::conflit('Les actions ne sont pas modifiables à l’étape « '.$fiche->etape()->libelle().' ».');
            }
            if (in_array($action->statut, StatutAction::terminees(), true)) {
                throw RegleMetierException::conflit('Une action réalisée ou annulée ne se modifie plus.');
            }
            $motif = trim((string) ($data['motif'] ?? ''));
            if ($motif === '') {
                throw RegleMetierException::conditionsManquantes('Motif obligatoire.', ['Indiquez pourquoi l’échéance ou le responsable change.']);
            }

            $changes = collect($data)->only(['echeance', 'responsable_id'])->filter(fn ($valeur) => $valeur !== null)->all();
            $ancienResponsable = $action->responsable_id;
            $ancienneEcheance = $action->echeance?->toDateString();
            $action->fill($changes);
            if (! $action->isDirty()) {
                return $action;
            }
            $action->save();

            $userId = $profile->userId();
            if ($action->wasChanged('echeance')) {
                $this->history->log($fiche, $userId, 'REPORT_ECHEANCE', 'action_'.$action->id, $ancienneEcheance, $action->echeance->toDateString(), $motif);
            }
            if ($action->wasChanged('responsable_id')) {
                $this->history->log($fiche, $userId, 'CHANGEMENT_RESPONSABLE', 'action_'.$action->id, $ancienResponsable, $action->responsable_id, $motif);
                $this->notifierAttribution($action, $fiche, $userId);
            } elseif ($action->wasChanged('echeance')) {
                $this->notifications->notify([$action->responsable_id], $fiche, 'ACTION_MODIFIEE', 'Échéance de l’action « '.str($action->description)->limit(50).' » reportée au '.$action->echeance->format('d/m/Y').'.', 'action', $action->id, $userId);
            }

            return $action->refresh();
        });
    }

    /**
     * Ajout d'une action oubliée pendant la réalisation, rattachée à une cause de la fiche (pilote).
     *
     * @param  array<string, mixed>  $data
     */
    public function ajouter(FicheA3 $fiche, array $data, ActiveProfile $profile): ActionA3
    {
        return DB::transaction(function () use ($fiche, $data, $profile): ActionA3 {
            /** @var FicheA3 $fiche */
            $fiche = FicheA3::query()->whereKey($fiche->id)->lockForUpdate()->firstOrFail();

            if (! $profile->estPiloteDe($fiche)) {
                throw RegleMetierException::interdit('Seul le pilote ajoute une action.');
            }
            if (! $this->etapeAjout($fiche)) {
                throw RegleMetierException::conflit('Une action s’ajoute ici pendant la réalisation ; avant, utilisez la section 6.');
            }
            $motif = trim((string) ($data['motif'] ?? ''));
            $manques = [];
            if ($motif === '') {
                $manques[] = 'Indiquez pourquoi cette action s’ajoute au plan validé.';
            }
            if (! $fiche->causes()->whereKey($data['cause_id'])->exists()) {
                $manques[] = 'Chaque action est rattachée à une cause de la section 5.';
            }
            if (($data['risque_id'] ?? null) !== null && ! $fiche->risques()->whereKey($data['risque_id'])->exists()) {
                $manques[] = 'Le MOC lié doit être un risque de la section 7.';
            }
            if (! ValeurListe::query()->where('code', $data['type_action'])->deLaListe('type_action')->exists()) {
                $manques[] = 'Le type d’action n’existe pas dans la liste.';
            }
            if ($manques !== []) {
                throw RegleMetierException::conditionsManquantes('Action impossible à ajouter.', $manques);
            }

            $action = ActionA3::create([
                'fiche_id' => $fiche->id,
                'cause_id' => $data['cause_id'],
                'risque_id' => $data['risque_id'] ?? null,
                'description' => $data['description'],
                'critere_efficacite' => $data['critere_efficacite'] ?? null,
                'type_action' => $data['type_action'],
                'responsable_id' => $data['responsable_id'],
                'echeance' => $data['echeance'],
                'cout_estime' => (int) ($data['cout_estime'] ?? 0),
                'statut' => StatutAction::AFaire->value,
            ]);

            $this->history->log($fiche, $profile->userId(), 'AJOUT_ACTION', 'action_'.$action->id, null, str($action->description)->limit(100)->toString(), $motif);
            $this->notifierAttribution($action, $fiche, $profile->userId());

            return $action;
        });
    }

    /**
     * Prévient le responsable qu'une action lui est attribuée (PRD §9).
     */
    public function notifierAttribution(ActionA3 $action, FicheA3 $fiche, ?int $auteurId): void
    {
        $this->notifications->notify(
            [$action->responsable_id],
            $fiche,
            'ACTION_ATTRIBUEE',
            'Action « '.str($action->description)->limit(50).' » à réaliser avant le '.$action->echeance->format('d/m/Y').'.',
            'action',
            $action->id,
            $auteurId,
        );
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

            if (! $profile->estPiloteDe($fiche)) {
                throw RegleMetierException::interdit('Seul le pilote enregistre un contrôle d’efficacité.');
            }
            if (! $this->etapeControles($fiche)) {
                throw RegleMetierException::conflit('Les contrôles ne sont pas modifiables à l’étape « '.$fiche->etape()->libelle().' ».');
            }
            if ($controle->resultat !== null) {
                throw RegleMetierException::conflit('Ce contrôle est déjà enregistré.');
            }
            if ($controle->date_echeance->isAfter(today())) {
                throw RegleMetierException::conditionsManquantes('Contrôle pas encore disponible.', ['Le contrôle est disponible à partir du '.$controle->date_echeance->format('d/m/Y').'.']);
            }

            if ($data['resultat'] === 'CONFORME' && blank($data['commentaire'] ?? null) && blank($data['preuve'] ?? null)) {
                throw RegleMetierException::conditionsManquantes('Constat obligatoire.', [Manque::controles('Un contrôle conforme se justifie : décrivez ce que vous avez constaté ou donnez la référence d’une preuve.', $action->id)]);
            }

            $correctiveId = null;
            if ($data['resultat'] === 'NON_CONFORME') {
                $corrective = $data['action_corrective'] ?? null;
                if (! is_array($corrective) || blank($corrective['description'] ?? null) || blank($corrective['echeance'] ?? null)) {
                    throw RegleMetierException::conditionsManquantes('Action corrective obligatoire.', ['B4 : un contrôle non conforme exige une action corrective (description et échéance).']);
                }

                $actionCorrective = ActionA3::create([
                    'fiche_id' => $fiche->id,
                    'cause_id' => $action->cause_id,
                    'action_origine_id' => $action->id,
                    'description' => $corrective['description'],
                    'type_action' => 'CORRECTIVE',
                    'critere_efficacite' => $action->critere_efficacite,
                    'responsable_id' => $corrective['responsable_id'] ?? $fiche->pilote_id,
                    'echeance' => $corrective['echeance'],
                    'cout_estime' => (int) ($corrective['cout_estime'] ?? 0),
                    'statut' => StatutAction::AFaire->value,
                ]);
                $correctiveId = $actionCorrective->id;
                $this->notifierAttribution($actionCorrective, $fiche, $profile->userId());
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

    /**
     * Le pilote, ou le responsable de l'action sur un profil Agent ou Pilote, à une étape
     * où l'action est modifiable. Sert aussi à l'affichage (FicheResource).
     */
    public function peutModifier(ActionA3 $action, FicheA3 $fiche, ActiveProfile $profile): bool
    {
        return $this->estAutorise($action, $fiche, $profile) && $this->etapePermise($action, $fiche);
    }

    /**
     * Le pilote reporte l'échéance ou change le responsable d'une action non terminée.
     */
    public function peutReplanifier(ActionA3 $action, FicheA3 $fiche, ActiveProfile $profile): bool
    {
        return $profile->estPiloteDe($fiche)
            && $this->etapePermise($action, $fiche)
            && ! in_array($action->statut, StatutAction::terminees(), true);
    }

    /**
     * Le pilote ajoute une action oubliée pendant la réalisation.
     */
    public function peutAjouter(FicheA3 $fiche, ActiveProfile $profile): bool
    {
        return $profile->estPiloteDe($fiche) && $this->etapeAjout($fiche);
    }

    /**
     * Le pilote enregistre les contrôles d'efficacité pendant le suivi.
     */
    public function peutEnregistrerControles(FicheA3 $fiche, ActiveProfile $profile): bool
    {
        return $profile->estPiloteDe($fiche) && $this->etapeControles($fiche);
    }

    private function etapeAjout(FicheA3 $fiche): bool
    {
        return $fiche->etape() === StatutEtape::RealisationActions;
    }

    private function etapeControles(FicheA3 $fiche): bool
    {
        return in_array($fiche->etape(), StatutEtape::etapesDeSuivi(), true);
    }

    private function exigerDroit(ActionA3 $action, FicheA3 $fiche, ActiveProfile $profile): void
    {
        if (! $this->estAutorise($action, $fiche, $profile)) {
            throw RegleMetierException::interdit('Seuls le pilote et le responsable de l’action la mettent à jour.');
        }
        if (! $this->etapePermise($action, $fiche)) {
            throw RegleMetierException::conflit('Les actions ne sont pas modifiables à l’étape « '.$fiche->etape()->libelle().' ».');
        }
    }

    private function estAutorise(ActionA3 $action, FicheA3 $fiche, ActiveProfile $profile): bool
    {
        return $profile->estPiloteDe($fiche)
            || ($profile->is('AGENT', 'PILOTE') && $action->responsable_id === $profile->userId());
    }

    /**
     * Une action du plan se modifie pendant la réalisation ; une action corrective pendant tout le suivi.
     */
    private function etapePermise(ActionA3 $action, FicheA3 $fiche): bool
    {
        $etapes = $action->action_origine_id !== null
            ? StatutEtape::etapesDeSuivi()
            : [StatutEtape::RealisationActions];

        return in_array($fiche->etape(), $etapes, true);
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
                throw RegleMetierException::conditionsManquantes('L’action ne peut pas démarrer.', array_map(fn (string $manque) => Manque::section(7, $manque), $manques));
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
