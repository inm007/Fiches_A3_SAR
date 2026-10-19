<?php

namespace App\Services;

use App\Enums\StatutAction;
use App\Enums\StatutEtape;
use App\Exceptions\RegleMetierException;
use App\Models\CompteurFiche;
use App\Models\FicheA3;
use App\Models\Validation;
use Illuminate\Support\Facades\DB;

/**
 * Machine à états de la fiche (PRD §5, TRD §10) : seul code autorisé à modifier
 * statut_etape. Chaque transition s'exécute en transaction avec verrou de ligne ;
 * 409 si la fiche a changé, 422 avec la liste des manques si une garde échoue.
 */
class FicheWorkflow
{
    public function __construct(
        private readonly ValidationCircuit $circuit,
        private readonly ControleEfficaciteService $controles,
        private readonly HistoryLogger $history,
        private readonly NotificationService $notifications,
        private readonly ActionService $actions,
    ) {}

    /**
     * T1 : déclaration en une étape, numéro A3-AAAA-NNN attribué sous verrou.
     *
     * @param  array<string, mixed>  $data
     */
    public function declarer(array $data, ActiveProfile $profile): FicheA3
    {
        if (! $profile->is('AGENT', 'PILOTE')) {
            throw RegleMetierException::interdit('Seuls les profils Agent et Pilote déclarent une fiche.');
        }

        return DB::transaction(function () use ($data, $profile): FicheA3 {
            $fiche = FicheA3::create([
                ...$data,
                'numero_a3' => CompteurFiche::prochainNumero((int) now()->year),
                'declarant_id' => $profile->userId(),
                'statut_etape' => StatutEtape::Ouvert->value,
                'statut_general' => StatutEtape::Ouvert->statutGeneral(),
                'confidentialite' => $data['confidentialite'] ?? 'NORMAL',
                'version' => 1,
            ]);

            $this->history->log($fiche, $profile->userId(), 'CHANGEMENT_STATUT', 'statut_etape', null, StatutEtape::Ouvert->value, 'T1 — Déclaration de la fiche');

            return $fiche;
        });
    }

    /**
     * @param  array{code: string, etape?: string|null, motif?: string|null}  $payload
     */
    public function transition(FicheA3 $fiche, array $payload, ActiveProfile $profile): FicheA3
    {
        return DB::transaction(function () use ($fiche, $payload, $profile): FicheA3 {
            /** @var FicheA3 $fiche */
            $fiche = FicheA3::query()->whereKey($fiche->id)->lockForUpdate()->firstOrFail();

            if (($payload['etape'] ?? null) !== null && $payload['etape'] !== $fiche->statut_etape) {
                throw RegleMetierException::conflit();
            }

            $motif = trim((string) ($payload['motif'] ?? ''));

            match ($payload['code']) {
                'T2' => $this->t2($fiche, $profile),
                'T3' => $this->t3($fiche, $profile),
                'T6' => $this->t6($fiche, $profile),
                'T7' => $this->t7($fiche, $profile),
                'T8' => $this->t8($fiche, $profile),
                'T11' => $this->t11($fiche, $profile, $motif),
                'T12' => $this->t12($fiche, $profile, $motif),
                'T13' => $this->t13($fiche, $profile),
                default => throw new RegleMetierException('Transition inconnue ou déclenchée par le système.'),
            };

            return $fiche->refresh();
        });
    }

    /**
     * Décision d'un valideur (porte 1 ou 2) ; enchaîne T4, T5, T9 ou T10.
     */
    public function decider(Validation $validation, string $decision, ?string $commentaire, ?string $retour, ActiveProfile $profile): Validation
    {
        return DB::transaction(function () use ($validation, $decision, $commentaire, $retour, $profile): Validation {
            /** @var FicheA3 $fiche */
            $fiche = FicheA3::query()->whereKey($validation->fiche_id)->lockForUpdate()->firstOrFail();
            /** @var Validation $validation */
            $validation = Validation::query()->whereKey($validation->id)->lockForUpdate()->firstOrFail();
            $userId = $profile->userId();

            if ($validation->valideur_id !== $userId || $validation->role_id !== $profile->roleId()) {
                throw RegleMetierException::interdit('Cette demande de validation ne vous est pas adressée sur le profil actif.');
            }

            if ($fiche->pilote_id === $userId) {
                throw RegleMetierException::conditionsManquantes('Décision refusée.', ['B8 : le pilote ne valide pas sa propre fiche.']);
            }

            if (! $this->circuit->estActionnable($validation, $fiche)) {
                throw RegleMetierException::conflit('Cette demande n’est plus active à l’étape courante de la fiche (B7). Rechargez la fiche.');
            }

            $commentaire = trim((string) $commentaire);
            if ($decision === 'REFUSE' && $commentaire === '') {
                throw RegleMetierException::conditionsManquantes('Refus impossible.', ['B6 : un commentaire est obligatoire pour tout refus.']);
            }

            if ($decision === 'VALIDE' && $validation->porte === 2 && $profile->is(ValidationCircuit::CONTROLE_GESTION)) {
                $enAttente = $fiche->gains()->where('statut', 'PROPOSE')->count();
                if ($enAttente > 0) {
                    throw RegleMetierException::conditionsManquantes('Approbation impossible.', ["{$enAttente} gain(s) restent à valider ou refuser."]);
                }
            }

            $validation->update([
                'decision' => $decision,
                'commentaire' => $commentaire === '' ? null : $commentaire,
                'decidee_le' => now(),
            ]);

            $role = $validation->role()->value('libelle');
            $this->history->log($fiche, $userId, $decision === 'VALIDE' ? 'APPROBATION' : 'REFUS', 'porte_'.$validation->porte, null, $role, $commentaire ?: null);

            $decision === 'VALIDE'
                ? $this->apresApprobation($fiche, $validation)
                : $this->apresRefus($fiche, $validation, $commentaire, $retour, $userId);

            return $validation->refresh();
        });
    }

    private function t2(FicheA3 $fiche, ActiveProfile $profile): void
    {
        $this->exigerEtape($fiche, StatutEtape::Ouvert);
        $this->exigerPilote($fiche, $profile);
        $this->changerEtape($fiche, StatutEtape::EnCours, $profile->userId(), 'T2 — Début de l’analyse');
    }

    private function t3(FicheA3 $fiche, ActiveProfile $profile): void
    {
        $this->exigerEtape($fiche, StatutEtape::EnCours);
        $this->exigerPilote($fiche, $profile);

        $manques = $this->manquesB2($fiche);
        if ($manques !== []) {
            throw RegleMetierException::conditionsManquantes('Le plan ne peut pas être soumis.', $manques);
        }

        $this->changerEtape($fiche, StatutEtape::EnValidationPlan, $profile->userId(), 'T3 — Soumission du plan');
        $roles = $this->circuit->rolesPorte1($fiche);
        $ouvertes = $this->circuit->ouvrir($fiche, 1, $roles);
        $this->notifierDemandes($fiche, $ouvertes, 'Validation du plan demandée');
        $this->avancerSiPorteApprouvee($fiche, 1);
    }

    private function t6(FicheA3 $fiche, ActiveProfile $profile): void
    {
        $this->exigerEtape($fiche, StatutEtape::RealisationActions);
        $this->exigerPilote($fiche, $profile);

        $actions = $fiche->actions()->get(['description', 'statut']);
        $manques = $actions->isEmpty() ? ['La fiche ne comporte aucune action.'] : [];
        foreach ($actions->whereNotIn('statut', StatutAction::terminees()) as $action) {
            $manques[] = 'Action « '.str($action->description)->limit(60).' » : ni réalisée ni annulée.';
        }

        if ($manques !== []) {
            throw RegleMetierException::conditionsManquantes('Les actions ne sont pas toutes terminées.', $manques);
        }

        $this->changerEtape($fiche, StatutEtape::MesureResultats, $profile->userId(), 'T6 — Actions terminées');
    }

    private function t7(FicheA3 $fiche, ActiveProfile $profile): void
    {
        $this->exigerEtape($fiche, StatutEtape::MesureResultats);
        $this->exigerPilote($fiche, $profile);

        $manques = $this->manquesB3($fiche);
        if ($fiche->objectif_atteint === null) {
            $manques[] = 'Section 8 : indiquer si l’objectif est atteint.';
        } elseif ($fiche->objectif_atteint === 'PARTIELLEMENT' && blank($fiche->ecart_objectif)) {
            $manques[] = 'Section 8 : objectif partiellement atteint, préciser l’écart et la suite donnée.';
        }

        if ($manques !== []) {
            throw RegleMetierException::conditionsManquantes('La vérification du maintien ne peut pas commencer.', $manques);
        }

        $this->changerEtape($fiche, StatutEtape::VerificationMaintien, $profile->userId(), 'T7 — Résultats mesurés');
    }

    private function t8(FicheA3 $fiche, ActiveProfile $profile): void
    {
        $this->exigerEtape($fiche, StatutEtape::VerificationMaintien);
        $this->exigerPilote($fiche, $profile);

        $manques = [...$this->manquesB3($fiche), ...$this->controles->manques($fiche)];
        if (! $fiche->perennisations()->exists()) {
            $manques[] = 'Section 10 : enregistrer au moins une action de pérennisation.';
        }
        if (! $fiche->lecons()->exists()) {
            $manques[] = 'Section 11 : renseigner les leçons apprises.';
        }
        if (! $fiche->sans_gain_chiffre && ! $fiche->gains()->exists()) {
            $manques[] = 'Section 9 : renseigner les gains ou cocher « sans gain chiffré ».';
        }

        $roles = $this->circuit->rolesPorte2($fiche);
        $manques = [...$manques, ...$this->circuit->rolesSansTitulaire($roles, $fiche)];

        if ($manques !== []) {
            throw RegleMetierException::conditionsManquantes('La clôture ne peut pas être soumise.', $manques);
        }

        $this->changerEtape($fiche, StatutEtape::EnValidationCloture, $profile->userId(), 'T8 — Soumission de la clôture');
        $ouvertes = $this->circuit->ouvrir($fiche, 2, $roles);
        $this->notifierDemandes($fiche, $ouvertes, 'Validation de la clôture demandée');
        $this->avancerSiPorteApprouvee($fiche, 2);
    }

    private function t11(FicheA3 $fiche, ActiveProfile $profile, string $motif): void
    {
        $this->exigerEtape($fiche, StatutEtape::MesureResultats, StatutEtape::VerificationMaintien);
        $this->exigerPilote($fiche, $profile);

        if ($motif === '') {
            throw RegleMetierException::conditionsManquantes('Nouvelle boucle impossible.', ['Motif obligatoire : objectif non atteint, partiellement atteint ou gain non maintenu.']);
        }

        $ancienneVersion = $fiche->version;
        $fiche->version = $ancienneVersion + 1;
        $fiche->save();
        $this->history->log($fiche, $profile->userId(), 'NOUVELLE_VERSION', 'version', $ancienneVersion, $fiche->version, $motif);
        $this->changerEtape($fiche, StatutEtape::EnCours, $profile->userId(), 'T11 — Nouvelle boucle', $motif);
    }

    private function t12(FicheA3 $fiche, ActiveProfile $profile, string $motif): void
    {
        if (! $fiche->etape()->estActive()) {
            throw RegleMetierException::conflit('La fiche n’est pas à une étape active.');
        }
        $this->exigerPiloteOuDirection($fiche, $profile);

        if ($motif === '') {
            throw RegleMetierException::conditionsManquantes('Mise en attente impossible.', ['B6 : un motif est obligatoire pour tout blocage.']);
        }

        $fiche->etape_avant_attente = $fiche->statut_etape;
        $fiche->motif_attente = str($motif)->limit(250)->toString();
        $this->changerEtape($fiche, StatutEtape::EnAttente, $profile->userId(), 'T12 — Mise en attente', $motif);
    }

    private function t13(FicheA3 $fiche, ActiveProfile $profile): void
    {
        $this->exigerEtape($fiche, StatutEtape::EnAttente);
        $this->exigerPiloteOuDirection($fiche, $profile);

        $precedente = StatutEtape::from($fiche->etape_avant_attente ?? StatutEtape::EnCours->value);
        $fiche->etape_avant_attente = null;
        $fiche->motif_attente = null;
        $this->changerEtape($fiche, $precedente, $profile->userId(), 'T13 — Levée du blocage');
    }

    private function apresApprobation(FicheA3 $fiche, Validation $validation): void
    {
        $roles = $this->circuit->rolesPorte($fiche, $validation->porte);
        $suivantes = $this->circuit->courantes($fiche, $validation->porte, $roles)
            ->filter(fn (Validation $autre) => $autre->ordre > $validation->ordre
                && $this->circuit->estActionnable($autre, $fiche));

        $this->notifierDemandes($fiche, $suivantes, $validation->porte === 1 ? 'Validation du plan demandée' : 'Validation de la clôture demandée');
        $this->notifications->notify([$fiche->pilote_id], $fiche, 'APPROBATION', 'Approbation : '.$validation->role()->value('libelle'), 'validation', $validation->id);
        $this->avancerSiPorteApprouvee($fiche, $validation->porte);
    }

    /**
     * T5 (porte 1 → En cours) ou T10 (porte 2 → Mesure ou Vérification).
     */
    private function apresRefus(FicheA3 $fiche, Validation $validation, string $commentaire, ?string $retour, ?int $userId): void
    {
        $this->circuit->annulerEnAttente($fiche, $validation->porte, 'Demande close après un refus.');

        if ($validation->porte === 1) {
            $this->changerEtape($fiche, StatutEtape::EnCours, $userId, 'T5 — Plan refusé', $commentaire);
        } else {
            $cible = $retour === StatutEtape::MesureResultats->value ? StatutEtape::MesureResultats : StatutEtape::VerificationMaintien;
            $this->changerEtape($fiche, $cible, $userId, 'T10 — Clôture refusée', $commentaire);
        }

        $this->notifications->notify([$fiche->pilote_id], $fiche, 'REFUS', 'Refus : '.$commentaire, 'validation', $validation->id, $userId);
    }

    /**
     * T4 et T9 : avancement par le Système quand toutes les demandes de la porte sont approuvées.
     */
    private function avancerSiPorteApprouvee(FicheA3 $fiche, int $porte): void
    {
        $roles = $this->circuit->rolesPorte($fiche, $porte);
        if (! $this->circuit->porteApprouvee($fiche, $porte, $roles)) {
            return;
        }

        if ($porte === 1) {
            $this->changerEtape($fiche, StatutEtape::RealisationActions, null, 'T4 — Plan approuvé');
            foreach ($fiche->actions()->whereNotIn('statut', StatutAction::terminees())->get() as $action) {
                $this->actions->notifierAttribution($action, $fiche, null);
            }

            return;
        }

        $fiche->date_cloture = now()->toDateString();
        $this->changerEtape($fiche, StatutEtape::Cloture, null, 'T9 — Clôture approuvée');
    }

    private function changerEtape(FicheA3 $fiche, StatutEtape $nouvelle, ?int $auteurId, string $libelle, ?string $commentaire = null): void
    {
        $ancienne = $fiche->statut_etape;
        $fiche->statut_etape = $nouvelle->value;
        $fiche->statut_general = $nouvelle->statutGeneral();
        $fiche->save();

        $this->history->log($fiche, $auteurId, 'CHANGEMENT_STATUT', 'statut_etape', $ancienne, $nouvelle->value, trim($libelle.($commentaire ? ' : '.$commentaire : '')));
        $this->notifications->notify(
            [$fiche->pilote_id, $fiche->declarant_id],
            $fiche,
            'CHANGEMENT_STATUT',
            'La fiche passe à l’étape « '.$nouvelle->libelle().' ».',
            auteurId: $auteurId,
        );
    }

    /**
     * B2 et conditions de soumission du plan (PRD §4.2, §5.3).
     *
     * @return array<int, string>
     */
    private function manquesB2(FicheA3 $fiche): array
    {
        $manques = [];

        if (blank($fiche->type_amelioration)) {
            $manques[] = 'Section 1 : type d’amélioration.';
        }
        if ($fiche->date_cible === null) {
            $manques[] = 'Section 1 : date cible.';
        }
        if (blank($fiche->contexte)) {
            $manques[] = 'Section 2 : contexte.';
        }
        if (! $fiche->indicateurs()->where('principal', true)->exists()) {
            $manques[] = 'Section 3 et 4 : indicateur principal.';
        }
        if (blank($fiche->objectif_smart)) {
            $manques[] = 'Section 4 : objectif SMART.';
        }
        if (blank($fiche->methode_analyse)) {
            $manques[] = 'Section 5 : méthode d’analyse.';
        } elseif ($fiche->methode_analyse === 'AUTRE' && blank($fiche->methode_precision)) {
            $manques[] = 'Section 5 : préciser la méthode « Autre ».';
        }
        if (! $fiche->causes()->exists()) {
            $manques[] = 'Section 5 : au moins une cause.';
        }
        if (! $fiche->actions()->exists()) {
            $manques[] = 'Section 6 : au moins une action rattachée à une cause.';
        }

        $domaines = $fiche->domaines()->get();
        if ($domaines->isEmpty()) {
            $manques[] = 'Section 7 : cocher au moins un domaine concerné.';
        }
        if ($domaines->where('domaine', 'AUTRES')->whereNull('valideur_role_id')->isNotEmpty()) {
            $manques[] = 'Section 7 : choisir le valideur du domaine « Autres ».';
        }

        return [...$manques, ...$this->circuit->rolesSansTitulaire($this->circuit->rolesPorte1($fiche), $fiche)];
    }

    /**
     * B3 : mesure Après du KPI principal et des KPI à ne pas dégrader.
     *
     * @return array<int, string>
     */
    private function manquesB3(FicheA3 $fiche): array
    {
        $manques = [];
        $indicateurs = $fiche->indicateurs()
            ->where(fn ($query) => $query->where('principal', true)->orWhere('a_ne_pas_degrader', true))
            ->withExists(['mesures as a_mesure_apres' => fn ($query) => $query->where('type', 'APRES')])
            ->get();

        if ($indicateurs->where('principal', true)->isEmpty()) {
            $manques[] = 'B3 : aucun indicateur principal.';
        }

        foreach ($indicateurs->where('a_mesure_apres', false) as $indicateur) {
            $manques[] = 'B3 : mesure Après manquante pour « '.$indicateur->libelle.' ».';
        }

        return $manques;
    }

    private function exigerEtape(FicheA3 $fiche, StatutEtape ...$etapes): void
    {
        if (! in_array($fiche->etape(), $etapes, true)) {
            throw RegleMetierException::conflit('Cette transition n’est pas possible à l’étape « '.$fiche->etape()->libelle().' ». Rechargez la fiche.');
        }
    }

    private function exigerPilote(FicheA3 $fiche, ActiveProfile $profile): void
    {
        if (! $profile->estPiloteDe($fiche)) {
            throw RegleMetierException::interdit('Seul le pilote désigné de la fiche, sur son profil Pilote, effectue cette opération.');
        }
    }

    private function exigerPiloteOuDirection(FicheA3 $fiche, ActiveProfile $profile): void
    {
        $estPilote = $profile->estPiloteDe($fiche);
        if (! $estPilote && ! $profile->is('DIRECTION')) {
            throw RegleMetierException::interdit('Seuls le pilote et la Direction mettent en attente ou lèvent le blocage.');
        }
    }

    /**
     * @param  iterable<Validation>  $validations
     */
    private function notifierDemandes(FicheA3 $fiche, iterable $validations, string $message): void
    {
        foreach ($validations as $validation) {
            $this->notifications->notify([$validation->valideur_id], $fiche, 'DEMANDE_VALIDATION', $message, 'validation', $validation->id);
        }
    }
}
