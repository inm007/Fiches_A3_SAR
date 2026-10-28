<?php

namespace App\Services;

use App\Enums\Confidentialite;
use App\Enums\Permission;
use App\Enums\StatutAction;
use App\Enums\StatutEtape;
use App\Exceptions\RegleMetierException;
use App\Models\Affectation;
use App\Models\CompteurFiche;
use App\Models\FicheA3;
use App\Models\FicheA3Mesure;
use App\Models\ValeurListe;
use App\Models\Validation;
use App\Support\Manque;
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
        private readonly FicheVersions $versions,
    ) {}

    /**
     * Rôles qui classent une fiche sans suite (doublon, hors sujet, déjà traité ailleurs).
     */
    public const array ROLES_CLASSEMENT = ['DIRECTION', 'ADMIN_FONCTIONNEL'];

    /**
     * T1 : déclaration en une étape, numéro A3-AAAA-NNN attribué sous verrou.
     *
     * @param  array<string, mixed>  $data
     */
    public function declarer(array $data, ActiveProfile $profile): FicheA3
    {
        if (! $profile->peut(Permission::DeclarerFiche)) {
            throw RegleMetierException::interdit('Votre profil n’a pas le droit de déclarer une fiche.');
        }

        // Un pilote qui déclare une fiche de son unité peut la piloter lui-même dès la déclaration.
        $piloter = (bool) ($data['piloter'] ?? false);
        unset($data['piloter']);
        if ($piloter && ! ($profile->is('PILOTE') && (int) $data['unite_id'] === $profile->uniteId())) {
            throw RegleMetierException::interdit('Seul un pilote de l’unité de la fiche peut la piloter dès la déclaration ; sinon, l’administrateur désignera le pilote.');
        }

        return DB::transaction(function () use ($data, $profile, $piloter): FicheA3 {
            $fiche = FicheA3::create([
                ...$data,
                'pilote_id' => $piloter ? $profile->userId() : null,
                'numero_a3' => CompteurFiche::prochainNumero((int) now()->year),
                'declarant_id' => $profile->userId(),
                'statut_etape' => StatutEtape::Ouvert->value,
                'statut_general' => StatutEtape::Ouvert->statutGeneral(),
                'confidentialite' => $data['confidentialite'] ?? Confidentialite::Normal->value,
                'version' => 1,
            ]);

            $this->history->log($fiche, $profile->userId(), 'CHANGEMENT_STATUT', 'statut_etape', null, StatutEtape::Ouvert->value, 'T1 — Déclaration de la fiche');
            if ($piloter) {
                $this->history->log($fiche, $profile->userId(), 'DESIGNATION_PILOTE', 'pilote_id', null, $profile->userId(), 'Auto-désignation à la déclaration');
            } else {
                $this->notifications->notify($this->administrateurs(), $fiche, 'PILOTE_A_DESIGNER', 'Nouvelle fiche déclarée : désignez un pilote de l’unité.', auteurId: $profile->userId());
            }

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
                'T0' => $this->t0($fiche, $profile),
                'T3' => $this->t3($fiche, $profile),
                'T6' => $this->t6($fiche, $profile),
                'T7' => $this->t7($fiche, $profile),
                'T8' => $this->t8($fiche, $profile),
                'T11' => $this->t11($fiche, $profile, $motif),
                'T12' => $this->t12($fiche, $profile, $motif),
                'T13' => $this->t13($fiche, $profile),
                'T14' => $this->t14($fiche, $profile, $motif),
                default => throw new RegleMetierException('Transition inconnue ou déclenchée par le système.'),
            };

            return $fiche->refresh();
        });
    }

    /**
     * Administrateurs fonctionnels actifs : ils désignent le pilote des fiches déclarées par un agent.
     *
     * @return array<int, int>
     */
    private function administrateurs(): array
    {
        return Affectation::query()
            ->titulaires('ADMIN_FONCTIONNEL')
            ->pluck('user_id')
            ->unique()
            ->values()
            ->all();
    }

    /**
     * Décision d'un valideur (porte 0, 1 ou 2) ; enchaîne la suite de la pertinence, T4, T5, T9 ou T10.
     * À la porte 0, le chef peut aussi refuser en classant la fiche sans suite.
     */
    public function decider(Validation $validation, string $decision, ?string $commentaire, ?string $retour, ActiveProfile $profile, ?int $section = null, bool $classer = false): Validation
    {
        return DB::transaction(function () use ($validation, $decision, $commentaire, $retour, $profile, $section, $classer): Validation {
            /** @var FicheA3 $fiche */
            $fiche = FicheA3::query()->whereKey($validation->fiche_id)->lockForUpdate()->firstOrFail();
            /** @var Validation $validation */
            $validation = Validation::query()->whereKey($validation->id)->lockForUpdate()->firstOrFail();
            $userId = $profile->userId();

            if (! $validation->estValideur($userId) || $validation->role_id !== $profile->roleId()) {
                throw RegleMetierException::interdit('Cette demande de validation ne vous est pas adressée sur le profil actif.');
            }

            if ($fiche->estRedacteur($userId)) {
                throw RegleMetierException::conditionsManquantes('Décision refusée.', [Manque::validations('B8 : le pilote et les membres de l’équipe ne valident pas leur propre fiche.')]);
            }

            if (! $this->circuit->estActionnable($validation, $fiche)) {
                throw RegleMetierException::conflit('Cette demande n’est plus active à l’étape courante de la fiche (B7). Rechargez la fiche.');
            }

            $commentaire = trim((string) $commentaire);
            if ($decision === 'REFUSE' && $commentaire === '') {
                throw RegleMetierException::conditionsManquantes('Refus impossible.', [Manque::validations('B6 : un commentaire est obligatoire pour tout refus.')]);
            }

            if ($decision === 'VALIDE' && $validation->porte === 2 && $profile->is(ValidationCircuit::CONTROLE_GESTION)) {
                $enAttente = $fiche->gains()->where('statut', 'PROPOSE')->count();
                if ($enAttente > 0) {
                    throw RegleMetierException::conditionsManquantes('Approbation impossible.', [Manque::validations("{$enAttente} gain(s) restent à valider ou refuser.")]);
                }
            }

            // Demande partagée : celui qui décide signe ; l'autre valideur reste associé.
            if ($validation->valideur_id !== $userId) {
                $validation->partages()->detach($userId);
                if ($validation->valideur_id !== null) {
                    $validation->partages()->syncWithoutDetaching([$validation->valideur_id => ['motif' => 'Valideur d’origine de la demande']]);
                }
                $validation->valideur_id = $userId;
            }

            $validation->update([
                'decision' => $decision,
                'commentaire' => $commentaire === '' ? null : $commentaire,
                'decidee_le' => now(),
                'section_concernee' => $decision === 'REFUSE' ? $section : null,
            ]);

            $role = $validation->role()->value('libelle');
            $this->history->log($fiche, $userId, $decision === 'VALIDE' ? 'APPROBATION' : 'REFUS', 'porte_'.$validation->porte, null, $role, $commentaire ?: null);

            $decision === 'VALIDE'
                ? $this->apresApprobation($fiche, $validation)
                : $this->apresRefus($fiche, $validation, $commentaire, $retour, $userId, $classer && $validation->porte === 0);

            return $validation->refresh();
        });
    }

    /**
     * T0 : le pilote soumet l'identification, le contexte, la situation actuelle et
     * l'objectif (sections 1 à 4) au chef de département qu'il a choisi en section 4.
     */
    private function t0(FicheA3 $fiche, ActiveProfile $profile): void
    {
        $this->exigerEtape($fiche, StatutEtape::Ouvert);
        if ($fiche->pertinence_validee_le !== null) {
            throw RegleMetierException::conflit('La pertinence de cette fiche est déjà validée.');
        }
        $this->exigerPilote($fiche, $profile);

        $roles = $this->circuit->rolesPorte0();
        $manques = [...$this->manquesPertinence($fiche), ...$this->circuit->rolesSansTitulaire($roles, $fiche, 0)];
        if ($manques !== []) {
            throw RegleMetierException::conditionsManquantes('La fiche ne peut pas être soumise au chef de département.', $manques);
        }

        $this->changerEtape($fiche, StatutEtape::EnValidationPertinence, $profile->userId(), 'T0 — Soumission de la pertinence');
        $ouvertes = $this->circuit->ouvrir($fiche, 0, $roles);
        $this->notifierDemandes($fiche, $ouvertes, 'Validation de la pertinence demandée');
    }

    /**
     * Pertinence validée : l'analyse commence avec le pilote et son équipe.
     */
    private function apresPertinence(FicheA3 $fiche): void
    {
        $fiche->pertinence_validee_le = now();
        $fiche->date_lancement ??= today();
        $this->changerEtape($fiche, StatutEtape::EnCours, null, 'T2 — Pertinence validée, début de l’analyse');
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
        $this->versions->figer($fiche, 'SOUMISSION_PLAN', $profile->userId());
        $roles = $this->circuit->rolesPorte1($fiche);
        $ouvertes = $this->circuit->ouvrir($fiche, 1, $roles);
        $this->notifierDemandes($fiche, $ouvertes, 'Validation du plan demandée');
        $this->avancerSiPorteApprouvee($fiche, 1);
    }

    private function t6(FicheA3 $fiche, ActiveProfile $profile): void
    {
        $this->exigerEtape($fiche, StatutEtape::RealisationActions);
        $this->exigerPilote($fiche, $profile);

        $manques = $this->manquesT6($fiche);
        if ($manques !== []) {
            throw RegleMetierException::conditionsManquantes('Les actions ne sont pas toutes terminées.', $manques);
        }

        $this->changerEtape($fiche, StatutEtape::MesureResultats, $profile->userId(), 'T6 — Actions terminées');
    }

    private function t7(FicheA3 $fiche, ActiveProfile $profile): void
    {
        $this->exigerEtape($fiche, StatutEtape::MesureResultats);
        $this->exigerPilote($fiche, $profile);

        $manques = $this->manquesT7($fiche);
        if ($manques !== []) {
            throw RegleMetierException::conditionsManquantes('La vérification du maintien ne peut pas commencer.', $manques);
        }

        $fiche->date_resultats = today();
        $this->changerEtape($fiche, StatutEtape::VerificationMaintien, $profile->userId(), 'T7 — Résultats mesurés');
    }

    private function t8(FicheA3 $fiche, ActiveProfile $profile): void
    {
        $this->exigerEtape($fiche, StatutEtape::VerificationMaintien);
        $this->exigerPilote($fiche, $profile);

        $manques = $this->manquesT8($fiche);
        $roles = $this->circuit->rolesPorte2($fiche);

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
        $this->reinitialiserResultats($fiche, $profile->userId());
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

    /**
     * T14 : classement sans suite (doublon, hors sujet, déjà traité ailleurs), avant
     * la soumission du plan, par la Direction ou l'administrateur fonctionnel.
     */
    private function t14(FicheA3 $fiche, ActiveProfile $profile, string $motif): void
    {
        $this->exigerEtape($fiche, StatutEtape::Ouvert, StatutEtape::EnValidationPertinence, StatutEtape::EnCours);
        if (! $profile->is(...self::ROLES_CLASSEMENT)) {
            throw RegleMetierException::interdit('Seules la Direction et l’administration fonctionnelle classent une fiche sans suite.');
        }
        if ($motif === '') {
            throw RegleMetierException::conditionsManquantes('Classement impossible.', ['Indiquez pourquoi la fiche est classée sans suite (doublon, hors sujet…).']);
        }

        $fiche->motif_classement = $motif;
        $this->circuit->annulerEnAttente($fiche, 0, 'Fiche classée sans suite.');
        $this->changerEtape($fiche, StatutEtape::ClasseSansSuite, $profile->userId(), 'T14 — Classée sans suite', $motif);
    }

    /**
     * Nouvelle boucle : les résultats de la boucle précédente ne valent plus pour la suivante.
     * L'historique et la copie figée gardent les anciennes valeurs.
     */
    private function reinitialiserResultats(FicheA3 $fiche, ?int $userId): void
    {
        $types = ['APRES', 'MAINTIEN_J30', 'MAINTIEN_J60', 'MAINTIEN_J90'];
        $mesures = FicheA3Mesure::query()
            ->whereIn('indicateur_id', $fiche->indicateurs()->pluck('id'))
            ->whereIn('type', $types);

        foreach ((clone $mesures)->with('indicateur:id,libelle')->get() as $mesure) {
            $this->history->log($fiche, $userId, 'REINITIALISATION_MESURE', 'mesure_'.$mesure->type, (string) $mesure->valeur, null, $mesure->indicateur?->libelle);
        }
        $mesures->delete();

        if ($fiche->objectif_atteint !== null) {
            $this->history->log($fiche, $userId, 'REINITIALISATION_MESURE', 'objectif_atteint', $fiche->objectif_atteint, null, 'Nouvelle boucle');
        }
        $fiche->objectif_atteint = null;
        $fiche->ecart_objectif = null;
        $fiche->date_resultats = null;
    }

    /**
     * Prochaine étape du pilote et conditions encore manquantes, pour le panneau
     * « Prochaine étape » : les mêmes gardes que les transitions, sans rien modifier.
     *
     * @return array{code: string, manques: array<int, string|Manque>}|null
     */
    public function prochaineEtape(FicheA3 $fiche): ?array
    {
        return match ($fiche->etape()) {
            StatutEtape::Ouvert => ['code' => 'T0', 'manques' => [
                ...($fiche->pilote_id === null ? ['L’administrateur fonctionnel doit désigner le pilote de la fiche.'] : []),
                ...$this->manquesPertinence($fiche),
                ...$this->circuit->rolesSansTitulaire($this->circuit->rolesPorte0(), $fiche, 0),
            ]],
            StatutEtape::EnCours => ['code' => 'T3', 'manques' => $this->manquesB2($fiche)],
            StatutEtape::RealisationActions => ['code' => 'T6', 'manques' => $this->manquesT6($fiche)],
            StatutEtape::MesureResultats => ['code' => 'T7', 'manques' => $this->manquesT7($fiche)],
            StatutEtape::VerificationMaintien => ['code' => 'T8', 'manques' => $this->manquesT8($fiche)],
            default => null,
        };
    }

    /**
     * T6 : toutes les actions terminées, au moins une réalisée, et chaque cause racine
     * traitée par une action réalisée (annuler tout le plan ne suffit pas).
     *
     * @return array<int, string|Manque>
     */
    private function manquesT6(FicheA3 $fiche): array
    {
        $actions = $fiche->actions()->get(['id', 'cause_id', 'description', 'statut']);
        if ($actions->isEmpty()) {
            return [Manque::section(6, 'La fiche ne comporte aucune action.')];
        }

        $manques = [];
        foreach ($actions->whereNotIn('statut', StatutAction::terminees()) as $action) {
            $manques[] = Manque::actions('Action « '.str($action->description)->limit(60).' » : ni réalisée ni annulée.', $action->id);
        }

        $realisees = $actions->where('statut', StatutAction::Realise->value);
        if ($realisees->isEmpty()) {
            $manques[] = Manque::actions('Aucune action réalisée : une fiche dont tout le plan est annulé ne peut pas montrer de résultat. Ajoutez une action ou classez la fiche.');
        }
        foreach ($fiche->causes()->where('racine', true)->get(['id', 'numero', 'libelle']) as $cause) {
            if ($actions->where('cause_id', $cause->id)->whereNotIn('statut', [StatutAction::Annule->value])->isEmpty()) {
                $manques[] = Manque::actions('Cause racine n° '.$cause->numero.' « '.str($cause->libelle)->limit(50).' » : toutes ses actions sont annulées. Ajoutez une action pour la traiter.');
            }
        }

        return $manques;
    }

    /**
     * T7 : B3, objectif renseigné ; un objectif non atteint impose une nouvelle boucle.
     *
     * @return array<int, string|Manque>
     */
    private function manquesT7(FicheA3 $fiche): array
    {
        return [...$this->manquesB3($fiche), ...$this->manquesObjectif($fiche)];
    }

    /**
     * @return array<int, Manque>
     */
    private function manquesObjectif(FicheA3 $fiche): array
    {
        return match (true) {
            $fiche->objectif_atteint === null => [Manque::section(8, 'Section 8 : indiquer si l’objectif est atteint.')],
            $fiche->objectif_atteint === 'NON' => [Manque::section(8, 'Objectif non atteint : la fiche ne peut pas avancer. Lancez une nouvelle boucle pour reprendre l’analyse.')],
            $fiche->objectif_atteint === 'PARTIELLEMENT' && blank($fiche->ecart_objectif) => [Manque::section(8, 'Section 8 : objectif partiellement atteint, préciser l’écart et la suite donnée.')],
            default => [],
        };
    }

    /**
     * T8 : résultats, contrôles d'action (B4), maintien du KPI principal, pérennisation
     * réalisée, leçons, gains, titulaires de la porte 2.
     *
     * @return array<int, string|Manque>
     */
    private function manquesT8(FicheA3 $fiche): array
    {
        $manques = [
            ...$this->manquesB3($fiche),
            ...$this->manquesObjectif($fiche),
            ...$this->controles->manques($fiche),
            ...$this->controles->manquesMaintien($fiche),
        ];

        $perennisations = $fiche->perennisations()->get(['type', 'statut']);
        $types = ValeurListe::query()->deLaListe('type_perennisation')->pluck('libelle', 'code');
        if ($perennisations->isEmpty()) {
            $manques[] = Manque::section(10, 'Section 10 : enregistrer au moins une action de pérennisation.');
        }
        foreach ($perennisations as $ligne) {
            if ($ligne->statut !== 'REALISE') {
                $manques[] = Manque::section(10, 'Section 10 : l’action de pérennisation « '.($types[$ligne->type] ?? $ligne->type).' » doit être réalisée.');
            }
        }
        if (! $fiche->lecons()->exists()) {
            $manques[] = Manque::section(11, 'Section 11 : renseigner les leçons apprises.');
        }
        if (! $fiche->sans_gain_chiffre && ! $fiche->gains()->exists()) {
            $manques[] = Manque::section(9, 'Section 9 : renseigner les gains ou cocher « sans gain chiffré ».');
        }

        return [...$manques, ...$this->circuit->rolesSansTitulaire($this->circuit->rolesPorte2($fiche), $fiche, 2)];
    }

    private function apresApprobation(FicheA3 $fiche, Validation $validation): void
    {
        $roles = $this->circuit->rolesPorte($fiche, $validation->porte);
        $suivantes = $this->circuit->courantes($fiche, $validation->porte, $roles)
            ->filter(fn (Validation $autre) => $autre->ordre > $validation->ordre
                && $this->circuit->estActionnable($autre, $fiche));

        $this->notifierDemandes($fiche, $suivantes, match ($validation->porte) {
            0 => 'Validation de la pertinence demandée',
            1 => 'Validation du plan demandée',
            default => 'Validation de la clôture demandée',
        });
        $this->notifications->notify($fiche->redacteursIds(), $fiche, 'APPROBATION', 'Approbation : '.$validation->role()->value('libelle'), 'validation', $validation->id);
        $this->avancerSiPorteApprouvee($fiche, $validation->porte);
    }

    /**
     * T5 (porte 1 → En cours) ou T10 (porte 2 → Mesure ou Vérification).
     */
    private function apresRefus(FicheA3 $fiche, Validation $validation, string $commentaire, ?string $retour, ?int $userId, bool $classer = false): void
    {
        $this->circuit->annulerEnAttente($fiche, $validation->porte, 'Demande close après un refus.');

        if ($classer) {
            $fiche->motif_classement = $commentaire;
            $this->changerEtape($fiche, StatutEtape::ClasseSansSuite, $userId, 'Pertinence refusée, fiche classée sans suite', $commentaire);
        } elseif ($validation->porte === 0) {
            $this->changerEtape($fiche, StatutEtape::Ouvert, $userId, 'Pertinence à revoir', $commentaire);
        } elseif ($validation->porte === 1) {
            $this->changerEtape($fiche, StatutEtape::EnCours, $userId, 'T5 — Plan refusé', $commentaire);
        } else {
            $cible = $retour === StatutEtape::MesureResultats->value ? StatutEtape::MesureResultats : StatutEtape::VerificationMaintien;
            $this->changerEtape($fiche, $cible, $userId, 'T10 — Clôture refusée', $commentaire);
        }

        $this->notifications->notify($fiche->redacteursIds(), $fiche, 'REFUS', 'Refus : '.$commentaire, 'validation', $validation->id, $userId);
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

        if ($porte === 0) {
            $this->apresPertinence($fiche);

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
        $this->versions->figer($fiche, 'CLOTURE', null);
    }

    private function changerEtape(FicheA3 $fiche, StatutEtape $nouvelle, ?int $auteurId, string $libelle, ?string $commentaire = null): void
    {
        $ancienne = $fiche->statut_etape;
        $fiche->statut_etape = $nouvelle->value;
        $fiche->statut_general = $nouvelle->statutGeneral();
        $fiche->save();

        $this->history->log($fiche, $auteurId, 'CHANGEMENT_STATUT', 'statut_etape', $ancienne, $nouvelle->value, trim($libelle.($commentaire ? ' : '.$commentaire : '')));
        $this->notifications->notify(
            [...$fiche->redacteursIds(), $fiche->declarant_id],
            $fiche,
            'CHANGEMENT_STATUT',
            'La fiche passe à l’étape « '.$nouvelle->libelle().' ».',
            auteurId: $auteurId,
        );
    }

    /**
     * B2 et conditions de soumission du plan (PRD §4.2, §5.3).
     *
     * @return array<int, string|Manque>
     */
    private function manquesB2(FicheA3 $fiche): array
    {
        $manques = $this->manquesPertinence($fiche);

        if (blank($fiche->methode_analyse)) {
            $manques[] = Manque::section(5, 'Section 5 : méthode d’analyse.');
        } elseif ($fiche->methode_analyse === 'AUTRE' && blank($fiche->methode_precision)) {
            $manques[] = Manque::section(5, 'Section 5 : préciser la méthode « Autre ».');
        }
        $racines = $fiche->causes()->where('racine', true)->pluck('id');
        if (! $fiche->causes()->exists()) {
            $manques[] = Manque::section(5, 'Section 5 : au moins une cause.');
        } elseif ($racines->isEmpty()) {
            $manques[] = Manque::section(5, 'Section 5 : cocher au moins une cause racine.');
        }
        $actions = $fiche->actions()->whereNull('action_origine_id')->where('statut', '!=', StatutAction::Annule->value)->get(['cause_id', 'critere_efficacite']);
        if ($actions->isEmpty()) {
            $manques[] = Manque::section(6, 'Section 6 : au moins une action rattachée à une cause.');
        } else {
            if ($racines->isNotEmpty() && $actions->whereIn('cause_id', $racines)->isEmpty()) {
                $manques[] = Manque::section(6, 'Section 6 : au moins une action doit traiter une cause racine.');
            }
            $sansCritere = $actions->filter(fn ($action) => blank($action->critere_efficacite))->count();
            if ($sansCritere > 0) {
                $manques[] = Manque::section(6, "Section 6 : {$sansCritere} action(s) sans critère d’efficacité (comment vérifier qu’elle a marché).");
            }
        }

        $domaines = $fiche->domaines()->get();
        if ($domaines->isEmpty()) {
            $manques[] = Manque::section(7, 'Section 7 : cocher au moins un domaine concerné.');
        }
        $autres = $domaines->firstWhere('domaine', 'AUTRES');
        if ($autres !== null && blank($autres->precision)) {
            $manques[] = Manque::section(7, 'Section 7 : préciser le domaine « Autres ».');
        }
        if ($autres !== null && $autres->valideur_role_id === null) {
            $manques[] = Manque::section(7, 'Section 7 : choisir le directeur qui valide le domaine « Autres ».');
        }

        return [...$manques, ...$this->circuit->rolesSansTitulaire($this->circuit->rolesPorte1($fiche), $fiche, 1)];
    }

    /**
     * Sections 1 à 4 que le pilote renseigne avant la validation de la pertinence.
     *
     * @return array<int, string|Manque>
     */
    private function manquesPertinence(FicheA3 $fiche): array
    {
        $manques = [];

        if (blank($fiche->type_amelioration)) {
            $manques[] = Manque::section(1, 'Section 1 : type d’amélioration.');
        }
        if ($fiche->date_cible === null) {
            $manques[] = Manque::section(1, 'Section 1 : date cible.');
        }
        if ($fiche->sponsor_id === null) {
            $manques[] = Manque::section(1, 'Section 1 : choisir le directeur sponsor, qui approuvera la clôture.');
        }
        if (blank($fiche->contexte)) {
            $manques[] = Manque::section(2, 'Section 2 : contexte.');
        }
        $principal = $fiche->indicateurs()->where('principal', true)->with('mesures')->first();
        if ($principal === null) {
            $manques[] = Manque::section(3, 'Section 3 et 4 : indicateur principal.');
        } else {
            if (! $principal->mesures->contains('type', 'ACTUELLE')) {
                $manques[] = Manque::section(3, 'Section 3 : valeur actuelle (Avant) du KPI principal.');
            }
            if (! $principal->mesures->contains('type', 'CIBLE')) {
                $manques[] = Manque::section(3, 'Section 3 : cible du KPI principal.');
            }
        }
        if (blank($fiche->objectif_smart)) {
            $manques[] = Manque::section(4, 'Section 4 : objectif SMART.');
        }
        if (blank($fiche->resultats_attendus)) {
            $manques[] = Manque::section(4, 'Section 4 : résultats attendus (conditions de clôture).');
        }
        if ($fiche->chef_pertinence_id === null) {
            $manques[] = Manque::section(4, 'Section 4 : choisir le chef de département qui valide la pertinence.');
        }

        return $manques;
    }

    /**
     * B3 : mesure Après du KPI principal et des KPI à ne pas dégrader.
     *
     * @return array<int, string|Manque>
     */
    private function manquesB3(FicheA3 $fiche): array
    {
        $manques = [];
        $indicateurs = $fiche->indicateurs()
            ->where(fn ($query) => $query->where('principal', true)->orWhere('a_ne_pas_degrader', true))
            ->withExists(['mesures as a_mesure_apres' => fn ($query) => $query->where('type', 'APRES')])
            ->get();

        if ($indicateurs->where('principal', true)->isEmpty()) {
            $manques[] = Manque::section(3, 'B3 : aucun indicateur principal.');
        }

        foreach ($indicateurs->where('a_mesure_apres', false) as $indicateur) {
            $manques[] = Manque::section(8, 'B3 : mesure Après manquante pour « '.$indicateur->libelle.' ».');
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
        if (! $estPilote && ! $profile->peut(Permission::MettreEnAttente)) {
            throw RegleMetierException::interdit('Seuls le pilote et les profils autorisés mettent en attente ou lèvent le blocage.');
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
