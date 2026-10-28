<?php

namespace App\Http\Resources;

use App\Enums\Domaine;
use App\Enums\Permission;
use App\Enums\StatutAction;
use App\Enums\StatutEtape;
use App\Models\ActionA3;
use App\Models\DomaineRole;
use App\Models\EvenementHistorique;
use App\Models\FicheA3;
use App\Models\FicheA3Indicateur;
use App\Models\Relance;
use App\Models\Role;
use App\Models\User;
use App\Models\ValeurListe;
use App\Models\Validation;
use App\Services\ActionService;
use App\Services\ActiveProfile;
use App\Services\Calculs;
use App\Services\ControleEfficaciteService;
use App\Services\FicheSectionService;
use App\Services\FicheWorkflow;
use App\Services\RelanceService;
use App\Services\ValidationCircuit;
use App\Support\Manque;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Détail complet d'une fiche : 12 sections, calculs (classe Calculs), complétude et
 * droits du profil actif. Les droits servent seulement à l'affichage : le serveur décide.
 *
 * @mixin FicheA3
 */
class FicheResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var FicheA3 $fiche */
        $fiche = $this->resource->loadMissing([
            'unite:id,code,libelle', 'equipement:id,code,libelle,reference_sap', 'origine:id,code,libelle', 'frequence:id,code,libelle',
            'declarant:id,nom,prenom', 'pilote:id,nom,prenom', 'membres:id,nom,prenom', 'sponsor:id,nom,prenom', 'chefPertinence:id,nom,prenom', 'referenceSap',
            'impacts', 'indicateurs.mesures', 'causes', 'domaines.roleValideur:id,code,libelle', 'risques.responsable:id,nom,prenom',
            'actions.responsable:id,nom,prenom', 'actions.controles', 'actions.cause:id,numero', 'gains', 'perennisations.responsable:id,nom,prenom',
            'lecons', 'validations.role:id,code,libelle', 'validations.valideur:id,nom,prenom', 'validations.partages:id,nom,prenom',
        ]);

        $calculs = app(Calculs::class);
        $profile = new ActiveProfile($request);
        $totalA = $calculs->totalA($fiche->gains->where('statut', '!=', 'REFUSE')->pluck('montant_annuel'));
        $totalAValide = $calculs->totalA($fiche->gains->where('statut', 'VALIDE')->pluck('montant_annuel'));
        $categoriesGain = ValeurListe::query()->deLaListe('categorie_gain')->pluck('libelle', 'code');
        $typesPerennisation = ValeurListe::query()->deLaListe('type_perennisation')->pluck('libelle', 'code');
        $relances = $this->dernieresRelances($fiche, $profile);
        $correspondance = DomaineRole::correspondance();
        $rolesLibelles = Role::query()->pluck('libelle', 'code');

        return [
            'id' => $fiche->id,
            'numero_a3' => $fiche->numero_a3,
            'titre' => $fiche->titre,
            'version' => $fiche->version,
            'statut_etape' => $fiche->statut_etape,
            'statut_etape_libelle' => $fiche->etape()->libelle(),
            'statut_general' => $fiche->statut_general,
            'etape_avant_attente' => $fiche->etape_avant_attente,
            'motif_attente' => $fiche->motif_attente,
            'confidentialite' => $fiche->confidentialite,
            'created_at' => $fiche->created_at?->toIso8601String(),
            'date_cloture' => $fiche->date_cloture?->toDateString(),
            'date_resultats' => $fiche->date_resultats?->toDateString(),
            'motif_classement' => $fiche->motif_classement,
            'declarant' => $this->personne($fiche->declarant),
            'pilote' => $this->personne($fiche->pilote),
            'membres' => $fiche->membres->sortBy('pivot.created_at')->values()->map(fn (User $user) => $this->personne($user)),
            'chef_pertinence' => $this->personne($fiche->chefPertinence),
            'pertinence_validee_le' => $fiche->pertinence_validee_le?->toIso8601String(),
            'derniers_enregistrements' => $this->derniersEnregistrements($fiche, $profile),

            'identification' => [
                'unite' => $fiche->unite?->only(['id', 'code', 'libelle']),
                'unite_id' => $fiche->unite_id,
                'equipement' => $fiche->equipement?->only(['id', 'code', 'libelle', 'reference_sap']),
                'equipement_id' => $fiche->equipement_id,
                'numero_avis_sap' => $fiche->referenceSap?->numero_avis,
                'numero_ordre_sap' => $fiche->referenceSap?->numero_ordre,
                'sponsor' => $this->personne($fiche->sponsor),
                'sponsor_id' => $fiche->sponsor_id,
                'date_lancement' => $fiche->date_lancement?->toDateString(),
                'date_cible' => $fiche->date_cible?->toDateString(),
                'type_amelioration' => $fiche->type_amelioration,
                'origine_id' => $fiche->origine_id,
                'origine' => $fiche->origine?->only(['id', 'code', 'libelle']),
                'origine_precision' => $fiche->origine_precision,
            ],
            'contexte' => [
                'contexte' => $fiche->contexte,
                'enonce_probleme' => $fiche->enonce_probleme,
                'frequence_id' => $fiche->frequence_id,
                'impacts' => $fiche->impacts->pluck('description', 'type_impact'),
                'impact_financier_estime' => $fiche->impact_financier_estime,
            ],
            'indicateurs' => $fiche->indicateurs->sortBy('id')->values()->map(fn (FicheA3Indicateur $indicateur) => $this->indicateur($indicateur, $calculs)),
            'objectif' => $fiche->only(['objectif_smart', 'perimetre', 'resultats_attendus', 'chef_pertinence_id']),
            'analyse' => [
                'methode_analyse' => $fiche->methode_analyse,
                'methode_precision' => $fiche->methode_precision,
                'causes' => $fiche->causes->sortBy('numero')->values()->map->only(['id', 'numero', 'categorie', 'libelle', 'niveau', 'racine', 'preuve']),
            ],
            'actions' => $fiche->actions->sortBy('id')->values()->map(fn (ActionA3 $action) => $this->action($action, $fiche, $relances)),
            'domaines' => $fiche->domaines->map(fn ($domaine) => [
                'domaine' => $domaine->domaine,
                'precision' => $domaine->precision,
                'valideur_role_code' => $domaine->roleValideur?->code,
                'valideur_role' => $domaine->roleValideur?->libelle,
                'directeurs' => $domaine->domaine === Domaine::Autres->value
                    ? array_filter([$domaine->roleValideur?->libelle])
                    : array_map(fn (string $code) => $rolesLibelles[$code] ?? $code, $correspondance[$domaine->domaine] ?? []),
            ]),
            'risques' => $fiche->risques->sortBy('id')->values()->map(fn ($risque) => [
                ...$risque->only(['id', 'domaine', 'description', 'moc_requis', 'moc_reference', 'moc_statut', 'moc_preuve', 'mesure_maitrise', 'responsable_id']),
                'responsable' => $this->personne($risque->responsable),
            ]),
            'resultats' => [
                ...$fiche->only(['objectif_atteint', 'ecart_objectif']),
                'objectif_suggere' => $this->objectifSuggere($fiche, $calculs),
            ],
            'maintien' => app(ControleEfficaciteService::class)->maintien($fiche),
            'cloture_au_plus_tot' => app(ControleEfficaciteService::class)->clotureAuPlusTot($fiche),
            'prochaine_etape' => $this->prochaineEtape($fiche),
            'gains' => [
                'lignes' => $fiche->gains->sortBy('id')->values()->map(fn ($gain) => [
                    ...$gain->only(['id', 'categorie', 'hypothese_calcul', 'montant_annuel', 'statut']),
                    'categorie_libelle' => $categoriesGain[$gain->categorie] ?? $gain->categorie,
                ]),
                'sans_gain_chiffre' => $fiche->sans_gain_chiffre,
                'cout_mise_en_oeuvre_b' => (int) $fiche->cout_mise_en_oeuvre_b,
                'total_a' => $totalA,
                'total_a_valide' => $totalAValide,
            ],
            'perennisation' => $fiche->perennisations->sortBy('id')->values()->map(fn ($ligne) => [
                ...$ligne->only(['id', 'type', 'responsable_id', 'statut', 'preuve']),
                'type_libelle' => $typesPerennisation[$ligne->type] ?? $ligne->type,
                'date' => $ligne->date?->toDateString(),
                'responsable' => $this->personne($ligne->responsable),
            ]),
            'lecons' => $fiche->lecons->pluck('texte', 'rubrique'),
            'validations' => $fiche->validations->sortBy('id')->values()->map(fn (Validation $validation) => $this->validation($validation, $fiche, $profile, $relances)),
            'completude' => $this->completude($fiche),
            'droits' => $this->droits($fiche, $profile),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function indicateur(FicheA3Indicateur $indicateur, Calculs $calculs): array
    {
        $valeur = fn (string $type): ?float => ($mesure = $indicateur->mesures->firstWhere('type', $type)) ? (float) $mesure->valeur : null;
        $apres = $indicateur->mesures->firstWhere('type', 'APRES');
        $reference = $valeur('REFERENCE');
        $cible = $valeur('CIBLE');
        $actuelle = $valeur('ACTUELLE');
        $valeurApres = $valeur('APRES');

        return [
            ...$indicateur->only(['id', 'libelle', 'unite_mesure', 'sens', 'principal', 'a_ne_pas_degrader', 'source', 'periode']),
            'reference' => $reference,
            'cible' => $cible,
            'actuelle' => $actuelle,
            'apres' => $valeurApres,
            'date_mesure_apres' => $apres?->date_mesure?->toDateString(),
            'periode_verification' => $apres?->periode_verification,
            'role' => $indicateur->principal ? 'PRINCIPAL' : ($indicateur->a_ne_pas_degrader ? 'A_NE_PAS_DEGRADER' : 'SUIVI'),
            'cible_tenue' => $calculs->cibleTenue($valeurApres, $cible, $indicateur->sens),
            'ecart' => $calculs->ecart($actuelle, $cible ?? $reference),
            'ecart_apres' => $calculs->ecart($valeurApres, $cible ?? $reference),
            'amelioration_pourcent' => $calculs->ameliorationPourcent($actuelle, $valeurApres, $indicateur->sens),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function action(ActionA3 $action, FicheA3 $fiche, ?array $relances): array
    {
        $derniere = $relances[ActionA3::class.':'.$action->id] ?? null;

        $statut = StatutAction::from($action->statut);

        return [
            ...$action->only(['id', 'cause_id', 'description', 'type_action', 'responsable_id', 'cout_estime', 'statut', 'motif_statut', 'risque_id', 'action_origine_id', 'statut_avant_blocage', 'critere_efficacite', 'preuve_realisation']),
            'cause_numero' => $action->cause?->numero,
            'statut_libelle' => $statut->libelle(),
            'echeance' => $action->echeance?->toDateString(),
            'date_realisation' => $action->date_realisation?->toDateString(),
            'en_retard' => ! $statut->estTerminee() && $action->echeance?->isBefore(today()),
            'responsable' => $this->personne($action->responsable),
            'derniere_relance' => $derniere?->toIso8601String(),
            'relancable' => $relances !== null && app(RelanceService::class)->actionEnRetard($action, $fiche) && ! $this->relanceRecente($derniere),
            'manques_moc' => in_array($statut, [StatutAction::AFaire, StatutAction::Bloque], true) ? app(ActionService::class)->manquesB1($action) : [],
            'controles' => $action->controles->sortBy('date_echeance')->values()->map(fn ($controle) => [
                ...$controle->only(['id', 'jalon', 'resultat', 'commentaire', 'preuve', 'action_corrective_id']),
                'date_echeance' => $controle->date_echeance?->toDateString(),
                'date_effective' => $controle->date_effective?->toDateString(),
                'disponible' => $controle->resultat === null && ! $controle->date_echeance->isAfter(today()),
            ]),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function validation(Validation $validation, FicheA3 $fiche, ActiveProfile $profile, ?array $relances): array
    {
        $derniere = $relances[Validation::class.':'.$validation->id] ?? null;
        $actionnable = $validation->decision === 'EN_ATTENTE'
            && $validation->estValideur($profile->userId())
            && $validation->role_id === $profile->roleId()
            && ! $fiche->estRedacteur($profile->userId())
            && app(ValidationCircuit::class)->estActionnable($validation, $fiche);

        return [
            ...$validation->only(['id', 'porte', 'decision', 'commentaire', 'version_fiche', 'ordre', 'section_concernee']),
            'role' => $validation->role?->only(['code', 'libelle']),
            'valideur' => $this->personne($validation->valideur),
            'partages' => $validation->partages->map(fn (User $user) => $this->personne($user))->values(),
            'demandee_le' => $validation->demandee_le?->toIso8601String(),
            'decidee_le' => $validation->decidee_le?->toIso8601String(),
            'anciennete_jours' => (int) $validation->demandee_le?->startOfDay()->diffInDays(($validation->decidee_le ?? now())->startOfDay()),
            'actionnable' => $actionnable,
            'derniere_relance' => $derniere?->toIso8601String(),
            'relancable' => $relances !== null && app(RelanceService::class)->validationEnAttente($validation, $fiche) && ! $this->relanceRecente($derniere),
        ];
    }

    /**
     * Réponse proposée à « objectif atteint » à partir du KPI principal : Oui si l'après tient
     * la cible, Partiellement s'il progresse sans l'atteindre, Non sinon. Le pilote confirme.
     */
    private function objectifSuggere(FicheA3 $fiche, Calculs $calculs): ?string
    {
        $principal = $fiche->indicateurs->firstWhere('principal', true);
        $valeur = fn (string $type): ?float => ($mesure = $principal?->mesures->firstWhere('type', $type)) ? (float) $mesure->valeur : null;
        if ($principal === null || $valeur('APRES') === null) {
            return null;
        }

        $tenue = $calculs->cibleTenue($valeur('APRES'), $valeur('CIBLE'), $principal->sens);
        $progres = $calculs->ameliorationPourcent($valeur('ACTUELLE'), $valeur('APRES'), $principal->sens);

        return match (true) {
            $tenue === true => 'OUI',
            $progres !== null && $progres > 0 => 'PARTIELLEMENT',
            $tenue === null && $progres === null => null,
            default => 'NON',
        };
    }

    /**
     * @return array{code: string, conditions: array<int, array{message: string, emplacement: array<string, mixed>|null}>}|null
     */
    private function prochaineEtape(FicheA3 $fiche): ?array
    {
        $prochaine = app(FicheWorkflow::class)->prochaineEtape($fiche);

        return $prochaine === null ? null : [
            'code' => $prochaine['code'],
            'conditions' => array_map(fn (string|Manque $manque) => Manque::versTableau($manque), array_values($prochaine['manques'])),
        ];
    }

    /**
     * Indicateur de complétude de la colonne des sections : vide, partiel ou complet.
     *
     * @return array<int, string>
     */
    private function completude(FicheA3 $fiche): array
    {
        $etat = function (array $valeurs): string {
            $remplies = count(array_filter($valeurs, fn ($valeur) => filled($valeur) && $valeur !== false));

            return $remplies === 0 ? 'vide' : ($remplies === count($valeurs) ? 'complet' : 'partiel');
        };

        return [
            1 => $etat([$fiche->titre, $fiche->type_amelioration, $fiche->date_cible, $fiche->origine_id]),
            2 => $etat([$fiche->enonce_probleme, $fiche->contexte]),
            3 => $etat([$fiche->indicateurs->isNotEmpty()]),
            4 => $etat([$fiche->objectif_smart, $fiche->indicateurs->contains('principal', true)]),
            5 => $etat([$fiche->methode_analyse, $fiche->causes->isNotEmpty()]),
            6 => $etat([$fiche->actions->isNotEmpty()]),
            7 => $etat([$fiche->domaines->isNotEmpty()]),
            8 => $etat([$fiche->objectif_atteint, $fiche->indicateurs->contains(fn ($indicateur) => $indicateur->mesures->contains('type', 'APRES'))]),
            9 => $fiche->sans_gain_chiffre ? 'complet' : $etat([$fiche->gains->isNotEmpty()]),
            10 => $etat([$fiche->perennisations->isNotEmpty()]),
            11 => $etat([$fiche->lecons->isNotEmpty()]),
            12 => $fiche->etape() === StatutEtape::Cloture ? 'complet' : ($fiche->validations->isNotEmpty() ? 'partiel' : 'vide'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function droits(FicheA3 $fiche, ActiveProfile $profile): array
    {
        $etape = $fiche->etape();
        $estPilote = $profile->estPiloteDe($fiche);
        $peutBloquer = $estPilote || $profile->peut(Permission::MettreEnAttente);

        $transitions = [];
        if ($estPilote) {
            $transitions = [...$transitions, ...match ($etape) {
                StatutEtape::Ouvert => ['T0'],
                StatutEtape::EnCours => ['T3'],
                StatutEtape::RealisationActions => ['T6'],
                StatutEtape::MesureResultats => ['T7', 'T11'],
                StatutEtape::VerificationMaintien => ['T8', 'T11'],
                default => [],
            }];
        }
        if ($peutBloquer && $etape->estActive()) {
            $transitions[] = 'T12';
        }
        if ($peutBloquer && $etape === StatutEtape::EnAttente) {
            $transitions[] = 'T13';
        }
        if ($profile->is(...FicheWorkflow::ROLES_CLASSEMENT) && in_array($etape, [StatutEtape::Ouvert, StatutEtape::EnValidationPertinence, StatutEtape::EnCours], true)) {
            $transitions[] = 'T14';
        }

        $userId = $profile->userId();

        return [
            'sections_editables' => app(FicheSectionService::class)->sectionsEditables($fiche, $profile),
            'sections_etat' => app(FicheSectionService::class)->etatsSections($fiche, $profile),
            'transitions' => array_values(array_unique($transitions)),
            'est_pilote' => $estPilote,
            'est_membre' => $fiche->estMembre($userId),
            'peut_gerer_equipe' => $estPilote && $etape->estActive(),
            'peut_designer_pilote' => $profile->is('ADMIN_FONCTIONNEL') && ! $etape->estFinale(),
            'peut_se_designer_pilote' => $profile->peutSeDesignerPilote($fiche),
            'peut_changer_confidentialite' => $estPilote || $profile->is('ADMIN_FONCTIONNEL'),
            'peut_commenter' => $profile->peutCommenter(),
            'peut_ajouter_piece_jointe' => $estPilote || $fiche->estMembre($userId) || ($profile->is('AGENT', 'PILOTE') && $fiche->actions->contains('responsable_id', $userId)),
            'peut_voir_historique' => $profile->peutVoirHistorique(),
            'peut_enregistrer_controles' => $estPilote && in_array($etape, StatutEtape::etapesDeSuivi(), true),
            'peut_decider_gains' => $profile->is(ValidationCircuit::CONTROLE_GESTION) && $fiche->validations->contains(
                fn (Validation $validation) => $validation->porte === 2 && $validation->estValideur($userId) && app(ValidationCircuit::class)->estActionnable($validation, $fiche)
            ),
            'actions_modifiables' => $fiche->actions
                ->filter(fn (ActionA3 $action) => app(ActionService::class)->peutModifier($action, $fiche, $profile))
                ->pluck('id')
                ->values(),
            'actions_replanifiables' => $fiche->actions
                ->filter(fn (ActionA3 $action) => app(ActionService::class)->peutReplanifier($action, $fiche, $profile))
                ->pluck('id')
                ->values(),
            'peut_ajouter_action' => $estPilote && $etape === StatutEtape::RealisationActions,
        ];
    }

    /**
     * Date de la dernière relance de chaque action et validation de la fiche, indexée par
     * « classe:id » ; null quand le profil actif ne peut pas relancer.
     *
     * @return array<string, CarbonInterface>|null
     */
    private function dernieresRelances(FicheA3 $fiche, ActiveProfile $profile): ?array
    {
        if (! app(RelanceService::class)->peutRelancer($fiche, $profile)) {
            return null;
        }

        return Relance::query()
            ->where(fn ($query) => $query
                ->where(fn ($action) => $action->where('cible_type', ActionA3::class)->whereIn('cible_id', $fiche->actions->modelKeys()))
                ->orWhere(fn ($validation) => $validation->where('cible_type', Validation::class)->whereIn('cible_id', $fiche->validations->modelKeys())))
            ->get(['cible_type', 'cible_id', 'created_at'])
            ->groupBy(fn (Relance $relance) => $relance->cible_type.':'.$relance->cible_id)
            ->map(fn ($groupe) => $groupe->max('created_at'))
            ->all();
    }

    private function relanceRecente(?CarbonInterface $derniere): bool
    {
        return $derniere !== null && $derniere->isAfter(now()->subDay());
    }

    /**
     * @return array{id: int, nom: string}|null
     */
    /**
     * Dernier enregistrement de chaque section (auteur et date) : le pilote voit ce que
     * chaque membre de l'équipe a fait. Réservé aux profils qui voient l'historique.
     *
     * @return array<int, array{numero: int, par: string|null, le: string|null}>
     */
    private function derniersEnregistrements(FicheA3 $fiche, ActiveProfile $profile): array
    {
        if (! $profile->estPiloteDe($fiche) && ! $profile->peutVoirHistorique()) {
            return [];
        }

        return EvenementHistorique::query()
            ->with('user:id,nom,prenom')
            ->where('fiche_id', $fiche->id)
            ->where('type', 'ENREGISTREMENT_SECTION')
            ->orderBy('id')
            ->get()
            ->keyBy('champ')
            ->map(fn (EvenementHistorique $evenement) => [
                'numero' => (int) str_replace('section_', '', (string) $evenement->champ),
                'par' => $evenement->user?->nom_complet,
                'le' => $evenement->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();
    }

    private function personne(?User $user): ?array
    {
        return $user === null ? null : ['id' => $user->id, 'nom' => $user->nom_complet];
    }
}
