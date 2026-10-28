<?php

namespace App\Services;

use App\Enums\Confidentialite;
use App\Enums\StatutAction;
use App\Enums\StatutEtape;
use App\Models\ActionA3;
use App\Models\EvenementHistorique;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Transforme chaque ligne d'historique en une phrase lisible : « Fatou Sarr a fait ceci, pour
 * telle raison ». Les champs techniques (statut_etape, action_12, pilote_id) ne sortent jamais
 * tels quels ; les identifiants de personnes et d'actions sont remplacés par leur nom.
 */
class HistoriqueRecit
{
    private const SECTIONS = [
        1 => 'Identification', 2 => 'Contexte, enjeu et problème', 3 => 'Situation actuelle', 4 => 'Objectif',
        5 => 'Analyse des causes racines', 6 => 'Plan de contre-mesures', 7 => 'Risques et MOC',
        8 => 'Résultats après action', 9 => 'Gains économiques', 10 => 'Standardisation et pérennisation',
        11 => 'Leçons apprises', 12 => 'Validation',
    ];

    private const CHAMPS = [
        'statut_etape' => 'l’étape', 'pilote_id' => 'le pilote', 'confidentialite' => 'la confidentialité',
        'equipe' => 'l’équipe', 'version' => 'la boucle',
        'objectif_atteint' => 'l’objectif atteint', 'enonce_probleme' => 'l’énoncé du problème',
        'contexte' => 'le contexte', 'objectif_smart' => 'l’objectif', 'date_cible' => 'la date cible',
        'titre' => 'le titre', 'sponsor_id' => 'le sponsor', 'unite_id' => 'l’unité', 'equipement_id' => 'l’équipement',
    ];

    /** @var Collection<int, string> */
    private Collection $noms;

    /** @var Collection<int, string> */
    private Collection $actions;

    /**
     * @param  Collection<int, EvenementHistorique>  $evenements
     * @return Collection<int, string> une phrase par identifiant d'événement
     */
    public function phrases(Collection $evenements): Collection
    {
        $this->noms = $this->chargerNoms($evenements);
        $this->actions = $this->chargerActions($evenements);

        return $evenements->mapWithKeys(fn (EvenementHistorique $evenement) => [$evenement->id => $this->phrase($evenement)]);
    }

    private function phrase(EvenementHistorique $evenement): string
    {
        $auteur = $evenement->user?->nom_complet ?? 'Le système';
        $ancien = $evenement->ancien_etat['valeur'] ?? null;
        $nouveau = $evenement->nouvel_etat['valeur'] ?? null;
        $action = $this->nomAction($evenement->champ);

        return match ($evenement->type) {
            'CHANGEMENT_STATUT' => $nouveau === StatutEtape::Ouvert->value
                ? "{$auteur} a déclaré la fiche."
                : "{$auteur} a fait passer la fiche à l’étape « ".$this->etape($nouveau).' ».',
            'ENREGISTREMENT_SECTION' => "{$auteur} a enregistré la section ".$this->section($evenement->champ).'.',
            'MODIFICATION_CHAMP' => "{$auteur} a modifié ".$this->champ($evenement->champ).' : '.$this->valeur($ancien).' → '.$this->valeur($nouveau).'.',
            'APPROBATION' => "{$auteur} a approuvé la fiche (".$this->porte($evenement->champ).').',
            'REFUS' => "{$auteur} a renvoyé la fiche au pilote (".$this->porte($evenement->champ).').',
            'DESIGNATION_PILOTE' => $nouveau === null
                ? "{$auteur} a retiré le pilote de la fiche."
                : "{$auteur} a désigné ".$this->nom($nouveau).' comme pilote.',
            'AJOUT_MEMBRE' => "{$auteur} a ajouté ".$this->nom($nouveau).' à l’équipe de la fiche.',
            'RETRAIT_MEMBRE' => "{$auteur} a retiré ".$this->nom($ancien).' de l’équipe de la fiche.',
            'PARTAGE_VALIDATION' => "{$auteur} a partagé une demande de validation avec ".$this->nom($nouveau).'.',
            'FIN_PARTAGE_VALIDATION' => "{$auteur} a mis fin au partage d’une demande de validation avec ".$this->nom($ancien).'.',
            'REATTRIBUTION_VALIDATION' => "{$auteur} a réattribué une demande de validation à ".$this->nom($nouveau).'.',
            'AJOUT_ACTION' => "{$auteur} a ajouté l’action « ".$nouveau.' ».',
            'STATUT_ACTION' => "{$auteur} a passé l’action {$action} de « ".$this->statutAction($ancien).' » à « '.$this->statutAction($nouveau).' ».',
            'REPORT_ECHEANCE' => "{$auteur} a reporté l’échéance de l’action {$action} du ".$this->date($ancien).' au '.$this->date($nouveau).'.',
            'CHANGEMENT_RESPONSABLE' => "{$auteur} a confié l’action {$action} à ".$this->nom($nouveau).'.',
            'CONTROLE_EFFICACITE' => "{$auteur} a enregistré un contrôle d’efficacité : ".$this->controle($nouveau).'.',
            'DECISION_GAIN' => "{$auteur} a ".($nouveau === 'VALIDE' ? 'validé' : 'refusé').' un gain.',
            'CHANGEMENT_CONFIDENTIALITE' => "{$auteur} a passé la fiche en « ".($nouveau === Confidentialite::Restreint->value ? 'Restreint' : 'Normal').' ».',
            'NOUVELLE_VERSION' => "{$auteur} a lancé la boucle {$nouveau} : l’analyse et le plan sont repris.",
            'REINITIALISATION_MESURE' => "{$auteur} a effacé une mesure pour la nouvelle boucle.",
            'RELANCE' => "{$auteur} a envoyé une relance.",
            'PIECE_JOINTE_AJOUTEE' => "{$auteur} a joint le fichier « ".$nouveau.' ».',
            'PIECE_JOINTE_SUPPRIMEE' => "{$auteur} a supprimé le fichier « ".$ancien.' ».',
            default => "{$auteur} : ".mb_strtolower(str_replace('_', ' ', $evenement->type)).'.',
        };
    }

    private function etape(mixed $valeur): string
    {
        return is_string($valeur) ? (StatutEtape::tryFrom($valeur)?->libelle() ?? $valeur) : (string) $valeur;
    }

    private function statutAction(mixed $valeur): string
    {
        return is_string($valeur) ? (StatutAction::tryFrom($valeur)?->libelle() ?? $valeur) : (string) $valeur;
    }

    private function section(?string $champ): string
    {
        $numero = (int) str_replace('section_', '', (string) $champ);

        return $numero.'. '.(self::SECTIONS[$numero] ?? '');
    }

    private function porte(?string $champ): string
    {
        return match ($champ) {
            'porte_0' => 'pertinence, porte 0',
            'porte_1' => 'plan d’actions, porte 1',
            default => 'clôture, porte 2',
        };
    }

    private function champ(?string $champ): string
    {
        return self::CHAMPS[$champ] ?? '« '.str_replace('_', ' ', (string) $champ).' »';
    }

    private function nomAction(?string $champ): string
    {
        $id = (int) str_replace('action_', '', (string) $champ);

        return $this->actions->has($id) ? '« '.$this->actions->get($id).' »' : '';
    }

    private function nom(mixed $valeur): string
    {
        return $this->noms->get((int) $valeur, 'cette personne');
    }

    private function controle(mixed $valeur): string
    {
        return is_string($valeur) ? str_replace(['J30', 'J60', 'J90', 'NON_CONFORME', 'CONFORME'], ['J+30', 'J+60', 'J+90', 'non conforme', 'conforme'], $valeur) : (string) $valeur;
    }

    private function date(mixed $valeur): string
    {
        return is_string($valeur) && strlen($valeur) >= 10 ? implode('/', array_reverse(explode('-', substr($valeur, 0, 10)))) : (string) $valeur;
    }

    private function valeur(mixed $valeur): string
    {
        if ($valeur === null || $valeur === '') {
            return 'vide';
        }
        if (is_bool($valeur)) {
            return $valeur ? 'oui' : 'non';
        }
        if (is_array($valeur)) {
            return 'une nouvelle valeur';
        }

        return '« '.$this->etape($valeur).' »';
    }

    /**
     * @param  Collection<int, EvenementHistorique>  $evenements
     * @return Collection<int, string>
     */
    private function chargerNoms(Collection $evenements): Collection
    {
        $champsPersonne = ['pilote_id', 'equipe', 'sponsor_id'];
        $ids = $evenements
            ->filter(fn (EvenementHistorique $evenement) => in_array($evenement->champ, $champsPersonne, true)
                || str_starts_with((string) $evenement->champ, 'validation_')
                || $evenement->type === 'CHANGEMENT_RESPONSABLE')
            ->flatMap(fn (EvenementHistorique $evenement) => [$evenement->ancien_etat['valeur'] ?? null, $evenement->nouvel_etat['valeur'] ?? null])
            ->filter(fn (mixed $valeur) => is_int($valeur) || (is_string($valeur) && ctype_digit($valeur)))
            ->map(fn (mixed $valeur) => (int) $valeur)
            ->unique();

        return $ids->isEmpty() ? collect() : User::query()->whereIn('id', $ids)->get()->mapWithKeys(fn (User $user) => [$user->id => $user->nom_complet]);
    }

    /**
     * @param  Collection<int, EvenementHistorique>  $evenements
     * @return Collection<int, string>
     */
    private function chargerActions(Collection $evenements): Collection
    {
        $ids = $evenements->map(fn (EvenementHistorique $evenement) => str_starts_with((string) $evenement->champ, 'action_')
            ? (int) str_replace('action_', '', (string) $evenement->champ)
            : null)->filter()->unique();

        return $ids->isEmpty()
            ? collect()
            : ActionA3::query()->whereIn('id', $ids)->get(['id', 'description'])
                ->mapWithKeys(fn (ActionA3 $action) => [$action->id => str($action->description)->limit(60)->toString()]);
    }
}
