<?php

namespace Tests\Concerns;

use App\Models\ActionA3;
use App\Models\Affectation;
use App\Models\Controle;
use App\Models\FicheA3;
use App\Models\Role;
use App\Models\Unite;
use App\Models\User;
use App\Models\ValeurListe;
use App\Models\Validation;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;

/**
 * Simulation d'acteurs et de fiches pour les tests du workflow A3 : une unité dédiée,
 * un titulaire par rôle, et des raccourcis pour amener une fiche à une étape donnée.
 */
trait SimuleFiches
{
    protected Unite $unite;

    /** @var array<string, array{0: User, 1: Affectation}> */
    protected array $acteurs = [];

    protected function setUpSimulation(): void
    {
        $this->seed();
        config(['session.driver' => 'array']);
        config(['sanctum.stateful' => array_merge(config('sanctum.stateful'), ['localhost:5173'])]);
        $this->withHeaders(['Origin' => 'http://localhost:5173', 'Referer' => 'http://localhost:5173/']);

        $this->unite = Unite::create(['code' => 'U-'.Str::random(6), 'libelle' => 'Unité de test', 'actif' => true]);
        foreach (['AGENT', 'PILOTE', 'VALIDEUR_PRODUCTION', 'VALIDEUR_HSE', 'VALIDEUR_PROCEDE', 'VALIDEUR_MAINTENANCE', 'VALIDEUR_INSPECTION', 'CONTROLE_GESTION', 'DIRECTION'] as $role) {
            $this->acteurs[$role] = $this->acteur($role, $this->unite->id);
        }
        $this->acteurs['ADMIN_FONCTIONNEL'] = $this->acteur('ADMIN_FONCTIONNEL', null);
        $this->acteurs['ADMIN_TECHNIQUE'] = $this->acteur('ADMIN_TECHNIQUE', null);
    }

    /**
     * @return array{indicateur: int, cause: int, risque: int, action: int}
     */
    protected function completerPlan(FicheA3 $fiche): array
    {
        $this->section($fiche, 1, [
            'titre' => 'Réduire la consommation de vapeur',
            'unite_id' => $this->unite->id,
            'origine_id' => $this->valeur('origine', 'AUDIT'),
            'type_amelioration' => 'ENERGIE',
            'date_lancement' => today()->toDateString(),
            'date_cible' => today()->addMonths(3)->toDateString(),
            'numero_avis_sap' => '1004587',
        ])->assertOk()->assertJsonPath('data.identification.numero_avis_sap', '1004587');
        $this->section($fiche, 2, ['contexte' => 'Purgeurs fuyards', 'enonce_probleme' => 'Consommation de vapeur élevée', 'impacts' => ['ENERGIE' => 'Surconsommation']])->assertOk();
        $indicateur = $this->section($fiche, 3, ['indicateurs' => [
            ['libelle' => 'Consommation vapeur', 'unite_mesure' => 't/h', 'sens' => 'baisse', 'reference' => 100, 'cible' => 80, 'actuelle' => 100],
        ]])->assertOk()->assertJsonPath('data.indicateurs.0.ecart', 20)->json('data.indicateurs.0.id');
        $this->section($fiche, 4, ['objectif_smart' => 'Réduire de 20 %', 'indicateur_principal_id' => $indicateur])->assertOk();
        $cause = $this->section($fiche, 5, ['methode_analyse' => '5_POURQUOI', 'causes' => [
            ['categorie' => 'METHODE', 'libelle' => 'Aucun plan d’inspection des purgeurs', 'niveau' => 1, 'racine' => true],
        ]])->assertOk()->json('data.analyse.causes.0.id');
        $risque = $this->section($fiche, 7, [
            'domaines' => [['domaine' => 'QHSE']],
            'risques' => [['domaine' => 'QHSE', 'description' => 'Fuite vapeur', 'moc_requis' => true, 'moc_statut' => 'OUVERT']],
        ])->assertOk()->json('data.risques.0.id');
        [$pilote] = $this->acteurs['PILOTE'];
        $action = $this->section($fiche, 6, ['actions' => [[
            'cause_id' => $cause,
            'description' => 'Remplacer 14 purgeurs',
            'type_action' => 'CORRECTIVE',
            'responsable_id' => $pilote->id,
            'echeance' => today()->addMonth()->toDateString(),
            'cout_estime' => 3_200_000,
            'risque_id' => $risque,
        ]]])->assertOk()->json('data.actions.0.id');

        return ['indicateur' => $indicateur, 'cause' => $cause, 'risque' => $risque, 'action' => $action];
    }

    protected function completerCloture(FicheA3 $fiche): void
    {
        $this->section($fiche, 9, [
            'gains' => [['categorie' => 'ENERGIE_ECONOMISEE', 'hypothese_calcul' => '−18 % de vapeur', 'quantite' => 4200, 'unite' => 't', 'cout_unitaire' => 2500]],
            'cout_mise_en_oeuvre_b' => 3_200_000,
        ])->assertOk()->assertJsonPath('data.gains.total_a', 10_500_000);
        $this->section($fiche, 10, ['perennisation' => [['type' => 'SOP', 'statut' => 'REALISE', 'preuve' => 'SOP-12']]])->assertOk();
        $this->section($fiche, 11, ['lecons' => ['A_FONCTIONNE' => 'L’inspection planifiée']])->assertOk();
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    protected function declarer(array $overrides = []): FicheA3
    {
        $id = $this->agir('AGENT')->postJson('/api/fiches', [...$this->declaration(), ...$overrides])
            ->assertCreated()
            ->json('data.id');

        return FicheA3::findOrFail($id);
    }

    /**
     * @return array<string, mixed>
     */
    protected function declaration(): array
    {
        return [
            'titre' => 'Consommation de vapeur élevée',
            'unite_id' => $this->unite->id,
            'origine_id' => $this->valeur('origine', 'AUDIT'),
            'enonce_probleme' => 'Les purgeurs fuient sur la ligne L-12.',
        ];
    }

    protected function designerPilote(FicheA3 $fiche): void
    {
        [$pilote] = $this->acteurs['PILOTE'];
        $this->agir('ADMIN_FONCTIONNEL')->patchJson("/api/admin/fiches/{$fiche->id}", ['pilote_id' => $pilote->id])->assertOk();
    }

    protected function transition(FicheA3 $fiche, string $role, string $code, ?string $motif = null): TestResponse
    {
        return $this->agir($role)->postJson("/api/fiches/{$fiche->id}/transitions", ['code' => $code, 'motif' => $motif]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    protected function section(FicheA3 $fiche, int $section, array $data): TestResponse
    {
        return $this->agir('PILOTE')->putJson("/api/fiches/{$fiche->id}/sections/{$section}", $data);
    }

    protected function decider(Validation $validation, string $role, string $decision, ?string $commentaire = null): TestResponse
    {
        return $this->agir($role)->postJson("/api/validations/{$validation->id}/decision", ['decision' => $decision, 'commentaire' => $commentaire]);
    }

    /**
     * @param  array<string, mixed>  $extra
     */
    protected function statutAction(ActionA3 $action, string $statut, array $extra = []): TestResponse
    {
        return $this->agir('PILOTE')->postJson("/api/actions/{$action->id}/statut", ['statut' => $statut, ...$extra]);
    }

    /**
     * @param  array<string, mixed>|null  $corrective
     */
    protected function controle(Controle $controle, string $resultat, ?array $corrective = null): TestResponse
    {
        return $this->agir('PILOTE')->patchJson("/api/controles/{$controle->id}", array_filter([
            'resultat' => $resultat,
            'action_corrective' => $corrective,
        ]));
    }

    protected function demande(FicheA3 $fiche, string $role): Validation
    {
        return Validation::where('fiche_id', $fiche->id)
            ->where('role_id', $this->roleId($role))
            ->where('decision', 'EN_ATTENTE')
            ->latest('id')
            ->firstOrFail();
    }

    protected function agir(string $role): self
    {
        [$user, $affectation] = $this->acteurs[$role];

        return $this->actingAs($user)->withSession(['auth.active_assignment_id' => $affectation->id]);
    }

    /**
     * @return array{0: User, 1: Affectation}
     */
    protected function acteur(string $roleCode, ?int $uniteId): array
    {
        $user = User::factory()->create(['identifiant' => strtolower($roleCode).'.'.Str::random(8), 'actif' => true]);
        $affectation = Affectation::create([
            'user_id' => $user->id,
            'role_id' => $this->roleId($roleCode),
            'unite_id' => $uniteId,
            'actif' => true,
        ]);

        return [$user, $affectation];
    }

    protected function roleId(string $code): int
    {
        return Role::where('code', $code)->value('id');
    }

    protected function valeur(string $liste, string $code): int
    {
        return ValeurListe::where('code', $code)->whereHas('liste', fn ($query) => $query->where('code', $liste))->value('id');
    }

    /**
     * Déclaration, pilote, T2, plan complet, T3 et approbation de la porte 1.
     *
     * @return array{indicateur: int, cause: int, risque: int, action: int}
     */
    protected function amenerEnRealisation(?FicheA3 $fiche = null): array
    {
        $fiche ??= $this->declarer();
        $this->designerPilote($fiche);
        $this->transition($fiche, 'PILOTE', 'T2')->assertOk();
        $ids = $this->completerPlan($fiche);
        $this->transition($fiche, 'PILOTE', 'T3')->assertOk();
        $this->approuverPorte($fiche, 1);
        $this->assertSame('REALISATION_ACTIONS', $fiche->refresh()->statut_etape);

        return $ids;
    }

    /**
     * Ferme le MOC, réalise l'action il y a $jours jours, T6, mesure Après et T7.
     *
     * @param  array{indicateur: int, cause: int, risque: int, action: int}  $ids
     */
    protected function amenerEnVerification(FicheA3 $fiche, array $ids, int $jours = 100): void
    {
        $this->fermerMoc($fiche, $ids['risque']);
        $this->statutAction(ActionA3::findOrFail($ids['action']), 'REALISE', ['date_realisation' => today()->subDays($jours)->toDateString()])->assertOk();
        $this->transition($fiche, 'PILOTE', 'T6')->assertOk();
        $this->section($fiche, 8, [
            'mesures' => [['indicateur_id' => $ids['indicateur'], 'valeur' => 75]],
            'objectif_atteint' => 'OUI',
        ])->assertOk();
        $this->transition($fiche, 'PILOTE', 'T7')->assertOk();
    }

    /**
     * Contrôles J+30, J+60, J+90 conformes, sections 9 à 11, puis T8.
     */
    protected function amenerEnValidationCloture(FicheA3 $fiche, int $actionId): void
    {
        foreach (Controle::where('action_id', $actionId)->orderBy('date_echeance')->get() as $controle) {
            $this->controle($controle, 'CONFORME')->assertOk();
        }
        $this->completerCloture($fiche);
        $this->transition($fiche, 'PILOTE', 'T8')->assertOk();
    }

    protected function fermerMoc(FicheA3 $fiche, int $risqueId): void
    {
        $this->section($fiche, 7, ['domaines' => [], 'risques' => [[
            'id' => $risqueId, 'domaine' => 'QHSE', 'description' => 'Fuite vapeur',
            'moc_reference' => 'MOC-2026-01', 'moc_statut' => 'CLOTURE', 'moc_preuve' => 'PV de clôture',
        ]]])->assertOk();
    }

    /**
     * Approuve toutes les demandes actives d'une porte, ordre par ordre.
     */
    protected function approuverPorte(FicheA3 $fiche, int $porte): void
    {
        for ($tour = 0; $tour < 4; $tour++) {
            $demandes = Validation::where('fiche_id', $fiche->id)->where('porte', $porte)->where('decision', 'EN_ATTENTE')
                ->with('role')->orderBy('ordre')->get();
            if ($demandes->isEmpty()) {
                return;
            }
            foreach ($demandes as $demande) {
                $this->decider($demande, $demande->role->code, 'VALIDE');
            }
        }
    }

    /**
     * @param  array{0: User, 1: Affectation}  $acteur
     */
    protected function agirComme(array $acteur): self
    {
        return $this->actingAs($acteur[0])->withSession(['auth.active_assignment_id' => $acteur[1]->id]);
    }
}
