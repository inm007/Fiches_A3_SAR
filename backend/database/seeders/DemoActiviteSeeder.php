<?php

namespace Database\Seeders;

use App\Models\ActionA3;
use App\Models\Commentaire;
use App\Models\FicheA3;
use App\Models\JournalAdministration;
use App\Models\NotificationInterne;
use App\Models\Parametre;
use App\Models\Perennisation;
use App\Models\ReferenceSap;
use App\Models\User;
use App\Models\Validation;
use App\Services\ActiveProfile;
use App\Services\PieceJointeService;
use App\Services\RelanceService;
use Illuminate\Database\Seeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * Le reste de la base de démonstration, autour des fiches simulées : paramètres, journal
 * d'administration, références SAP, commentaires, pièces jointes (vrais fichiers sur le disque
 * privé), rappels automatiques et notifications déjà lues.
 */
class DemoActiviteSeeder extends Seeder
{
    use ProfilsDemo;

    public function __construct(
        private readonly PieceJointeService $piecesJointes,
        private readonly RelanceService $relances,
    ) {}

    public function run(): void
    {
        if (! app()->environment('local')) {
            throw new RuntimeException('L’activité de démonstration n’est créée qu’en local.');
        }

        Storage::disk('local')->deleteDirectory('pieces-jointes');

        $this->journalAdministration();
        $this->parametres();
        $this->referencesSap();
        foreach (FicheA3::orderBy('id')->get() as $fiche) {
            $this->commentaires($fiche);
            $this->joindreFichiers($fiche);
        }

        Carbon::setTestNow();
        $this->relances->rappels();
        $this->lireNotifications();
    }

    /**
     * Création des comptes, des affectations et du référentiel, puis quelques opérations courantes.
     */
    private function journalAdministration(): void
    {
        $technique = $this->id('admin-technique.demo');
        $technique2 = $this->id('admin-technique2.demo');
        $fonctionnel = $this->id('admin-fonctionnel.demo');
        $debut = now()->subDays(210);

        User::query()->update(['created_at' => $debut]);
        foreach (User::with('affectations.role')->orderBy('id')->get() as $index => $user) {
            $this->journal($index % 2 ? $technique2 : $technique, 'CREATION', 'user:'.$user->id, ['identifiant' => $user->identifiant], $debut->copy()->addMinutes($index));
            foreach ($user->affectations as $affectation) {
                $this->journal($fonctionnel, 'CREATION', 'affectation:'.$affectation->id, ['user' => $user->identifiant, 'role' => $affectation->role->code, 'unite_id' => $affectation->unite_id], $debut->copy()->addHours(2)->addMinutes($index));
            }
        }
        foreach (['unite', 'entite', 'equipement'] as $index => $objet) {
            $this->journal($fonctionnel, 'CREATION', $objet, ['source' => 'Reprise du référentiel de la raffinerie'], $debut->copy()->addDay()->addHours($index));
        }

        $ancien = User::where('identifiant', 'ancien-agent.demo')->firstOrFail();
        $this->journal($technique2, 'MODIFICATION', 'user:'.$ancien->id, ['actif' => ['avant' => true, 'apres' => false], 'motif' => 'Départ à la retraite'], now()->subDays(120));
        $this->journal($technique2, 'ENVOI_LIEN_MOT_DE_PASSE', 'user:'.$this->id('agent2.demo'), [], now()->subDays(20));
    }

    private function parametres(): void
    {
        $valeurs = ['reminder_interval_days' => 7, 'validation_reminders_enabled' => true, 'due_soon_days' => 5, 'attachment_max_size_mb' => 10, 'attachment_max_files' => 20];
        foreach ($valeurs as $cle => $valeur) {
            Parametre::updateOrCreate(['cle' => $cle], ['valeur' => is_bool($valeur) ? ($valeur ? 'true' : 'false') : (string) $valeur]);
        }
        $this->journal($this->id('admin-fonctionnel2.demo'), 'MODIFICATION', 'parametres', ['due_soon_days' => ['avant' => 3, 'apres' => 5]], now()->subDays(150));
    }

    /**
     * Les avis et ordres saisis en section 1 sont complétés comme par l'interface SAP.
     */
    private function referencesSap(): void
    {
        foreach (ReferenceSap::with(['fiche', 'equipement'])->get() as $reference) {
            $fiche = $reference->fiche;
            $reference->update([
                'libelle' => str(($reference->equipement?->code ?? 'Unité').' — '.$fiche?->titre)->limit(120)->toString(),
                'statut' => match (true) {
                    $fiche === null => null,
                    $fiche->statut_etape === 'CLOTURE' => 'TECO',
                    $fiche->actions()->exists() => 'LANCÉ',
                    default => 'CRÉÉ',
                },
                'cout' => $fiche?->actions()->sum('cout_estime') ?: null,
            ]);
        }
    }

    /**
     * Échanges de l'équipe : sur la fiche, sur les actions réalisées et en réponse aux refus.
     */
    private function commentaires(FicheA3 $fiche): void
    {
        if ($fiche->pilote_id === null) {
            return;
        }

        $this->aLaDate($fiche->created_at->copy()->addHours(3));
        $this->commenter($fiche, $fiche->declarant_id, 'FICHE', null, 'Relevés de ronde disponibles sur demande, le phénomène est visible surtout au quart de nuit.');

        foreach ($fiche->actions()->where('statut', 'REALISE')->get() as $action) {
            $this->aLaDate($action->updated_at->copy()->subHour());
            $this->commenter($fiche, $action->responsable_id, 'ACTION', $action->id, 'Intervention terminée, compte rendu joint à l’action.');
        }

        foreach (Validation::where('fiche_id', $fiche->id)->where('decision', 'REFUSE')->get() as $validation) {
            $this->aLaDate($validation->decidee_le->copy()->addHours(2));
            $this->commenter($fiche, $fiche->pilote_id, 'VALIDATION', $validation->id, 'Bien noté : je reprends la fiche avec l’équipe et je la soumets à nouveau.');
        }

        foreach (Validation::where('fiche_id', $fiche->id)->where('porte', 1)->where('decision', 'EN_ATTENTE')->whereNotNull('valideur_id')->get() as $validation) {
            $this->aLaDate($validation->demandee_le->copy()->addDay());
            $this->commenter($fiche, $validation->valideur_id, 'VALIDATION', $validation->id, 'Je regarde le plan avec mon équipe cette semaine.');
        }
    }

    /**
     * Comptes rendus sur les actions réalisées, preuves de pérennisation et photo du constat.
     */
    private function joindreFichiers(FicheA3 $fiche): void
    {
        if ($fiche->pilote_id === null || ($fiche->etape()->estFinale() && $fiche->statut_etape !== 'CLOTURE')) {
            return;
        }

        $pilote = $this->profil(User::findOrFail($fiche->pilote_id)->identifiant, 'PILOTE', $fiche->unite_id);
        foreach ($fiche->actions()->where('statut', 'REALISE')->get() as $action) {
            $this->aLaDate($action->updated_at);
            $this->joindre($fiche, $this->pdf("Compte rendu d’intervention — action {$action->id}"), "CR-intervention-action-{$action->id}.pdf", $action, $pilote);
        }

        foreach (Perennisation::where('fiche_id', $fiche->id)->where('statut', 'REALISE')->get() as $perennisation) {
            $this->aLaDate($perennisation->updated_at);
            $this->joindre($fiche, $this->pdf("{$perennisation->type} révisé(e) — fiche {$fiche->numero_a3}"), "{$perennisation->type}-{$fiche->id}.pdf", $perennisation, $pilote);
        }

        $agent = $fiche->membres()->whereHas('affectations.role', fn ($q) => $q->where('code', 'AGENT'))->first();
        if ($agent !== null) {
            $this->aLaDate($fiche->created_at->copy()->addHours(5));
            $this->joindre($fiche, $this->png("Constat — {$fiche->numero_a3}"), 'photo-constat.png', null, $this->profil($agent->identifiant, 'AGENT', $fiche->unite_id));
        }
    }

    private function joindre(FicheA3 $fiche, string $chemin, string $nom, ActionA3|Perennisation|null $objet, ActiveProfile $profil): void
    {
        $this->piecesJointes->ajouter($fiche, new UploadedFile($chemin, $nom, null, null, true), $objet, $profil);
        @unlink($chemin);
    }

    /**
     * Un vrai petit PDF d'une page, lisible dans le navigateur.
     */
    private function pdf(string $texte): string
    {
        $texte = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], iconv('UTF-8', 'Windows-1252//TRANSLIT', $texte) ?: $texte);
        $flux = "BT /F1 14 Tf 60 760 Td ({$texte}) Tj ET";
        $objets = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
            '<< /Length '.strlen($flux)." >>\nstream\n{$flux}\nendstream",
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
        ];
        $pdf = "%PDF-1.4\n";
        $positions = [];
        foreach ($objets as $index => $objet) {
            $positions[] = strlen($pdf);
            $pdf .= ($index + 1)." 0 obj\n{$objet}\nendobj\n";
        }
        $xref = strlen($pdf);
        $pdf .= "xref\n0 ".(count($objets) + 1)."\n0000000000 65535 f \n";
        foreach ($positions as $position) {
            $pdf .= sprintf("%010d 00000 n \n", $position);
        }
        $pdf .= 'trailer << /Size '.(count($objets) + 1)." /Root 1 0 R >>\nstartxref\n{$xref}\n%%EOF\n";

        return $this->fichierTemporaire($pdf);
    }

    /**
     * Une image PNG générée : bandeau et légende, à la place d'une photo de terrain.
     */
    private function png(string $legende): string
    {
        $image = imagecreatetruecolor(480, 270);
        imagefill($image, 0, 0, imagecolorallocate($image, 52, 73, 94));
        imagefilledrectangle($image, 0, 200, 480, 270, imagecolorallocate($image, 236, 240, 241));
        imagestring($image, 5, 16, 225, iconv('UTF-8', 'ASCII//TRANSLIT', $legende) ?: $legende, imagecolorallocate($image, 44, 62, 80));
        ob_start();
        imagepng($image);

        return $this->fichierTemporaire((string) ob_get_clean());
    }

    private function fichierTemporaire(string $contenu): string
    {
        $chemin = tempnam(sys_get_temp_dir(), 'demo');
        file_put_contents($chemin, $contenu);

        return $chemin;
    }

    /**
     * Les notifications de plus de trois jours sont lues le lendemain ; les récentes restent à lire.
     */
    private function lireNotifications(): void
    {
        NotificationInterne::query()->where('created_at', '<', now()->subDays(3))
            ->update(['lu_le' => DB::raw("created_at + interval '1 day'")]);
    }

    private function commenter(FicheA3 $fiche, int $auteurId, string $contexte, ?int $objetId, string $texte): void
    {
        Commentaire::create(['fiche_id' => $fiche->id, 'auteur_id' => $auteurId, 'contexte' => $contexte, 'objet_id' => $objetId, 'texte' => $texte]);
    }

    /**
     * @param  array<string, mixed>  $detail
     */
    private function journal(int $auteurId, string $operation, string $objet, array $detail, Carbon $le): void
    {
        JournalAdministration::create(['auteur_id' => $auteurId, 'operation' => $operation, 'objet' => $objet, 'detail' => $detail, 'created_at' => $le]);
    }

    private function aLaDate(Carbon $date): void
    {
        Carbon::setTestNow();
        Carbon::setTestNow($date->isFuture() ? null : $date);
    }

    private function id(string $identifiant): int
    {
        return User::where('identifiant', $identifiant)->value('id');
    }
}
