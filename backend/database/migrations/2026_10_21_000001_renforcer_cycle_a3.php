<?php

use Database\Seeders\ReferenceListsSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Cycle de vie A3 renforcé : classement sans suite, date de la mesure des résultats
 * (point de départ du maintien), critère d'efficacité et preuve des actions, mesures de
 * maintien du KPI principal, section pointée par un refus et copies figées de la fiche.
 */
return new class extends Migration
{
    private const array ETAPES = ['OUVERT', 'EN_COURS', 'EN_VALIDATION_PLAN', 'REALISATION_ACTIONS', 'MESURE_RESULTATS', 'VERIFICATION_MAINTIEN', 'EN_VALIDATION_CLOTURE', 'EN_ATTENTE', 'CLOTURE'];

    public function up(): void
    {
        Schema::table('fiches_a3', function (Blueprint $table) {
            $table->date('date_resultats')->nullable();
            $table->text('motif_classement')->nullable();
        });
        $this->contrainte('fiches_a3', 'fiches_a3_statut_etape_check', 'statut_etape', [...self::ETAPES, 'CLASSE_SANS_SUITE']);
        $this->contrainte('fiches_a3', 'fiches_a3_statut_general_check', 'statut_general', ['OUVERT', 'EN_COURS', 'EN_ATTENTE', 'CLOTURE', 'CLASSE']);

        Schema::table('actions', function (Blueprint $table) {
            $table->text('critere_efficacite')->nullable();
            $table->text('preuve_realisation')->nullable();
        });

        Schema::table('mesures', function (Blueprint $table) {
            $table->text('commentaire')->nullable();
        });
        $this->contrainte('mesures', 'mesures_type_check', 'type', ['REFERENCE', 'CIBLE', 'ACTUELLE', 'APRES', 'MAINTIEN_J30', 'MAINTIEN_J60', 'MAINTIEN_J90']);

        Schema::table('validations', function (Blueprint $table) {
            $table->unsignedTinyInteger('section_concernee')->nullable();
        });

        Schema::create('fiche_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiche_id')->constrained('fiches_a3')->restrictOnDelete();
            $table->unsignedInteger('version');
            $table->string('evenement', 30);
            $table->jsonb('contenu');
            $table->foreignId('auteur_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestampsTz();
            $table->index(['fiche_id', 'id']);
        });
        DB::statement("ALTER TABLE fiche_versions ADD CONSTRAINT fiche_versions_evenement_check CHECK (evenement IN ('SOUMISSION_PLAN', 'CLOTURE'))");

        $this->ajouterListes();
    }

    public function down(): void
    {
        Schema::dropIfExists('fiche_versions');
        Schema::table('validations', fn (Blueprint $table) => $table->dropColumn('section_concernee'));
        DB::table('mesures')->whereIn('type', ['MAINTIEN_J30', 'MAINTIEN_J60', 'MAINTIEN_J90'])->delete();
        $this->contrainte('mesures', 'mesures_type_check', 'type', ['REFERENCE', 'CIBLE', 'ACTUELLE', 'APRES']);
        Schema::table('mesures', fn (Blueprint $table) => $table->dropColumn('commentaire'));
        Schema::table('actions', fn (Blueprint $table) => $table->dropColumn(['critere_efficacite', 'preuve_realisation']));
        $this->contrainte('fiches_a3', 'fiches_a3_statut_etape_check', 'statut_etape', self::ETAPES);
        $this->contrainte('fiches_a3', 'fiches_a3_statut_general_check', 'statut_general', ['OUVERT', 'EN_COURS', 'EN_ATTENTE', 'CLOTURE']);
        Schema::table('fiches_a3', fn (Blueprint $table) => $table->dropColumn(['date_resultats', 'motif_classement']));
    }

    /**
     * @param  array<int, string>  $valeurs
     */
    private function contrainte(string $table, string $nom, string $colonne, array $valeurs): void
    {
        DB::statement("ALTER TABLE {$table} DROP CONSTRAINT IF EXISTS {$nom}");
        $liste = implode(', ', array_map(fn (string $valeur) => "'{$valeur}'", $valeurs));
        DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$nom} CHECK ({$colonne} IN ({$liste}))");
    }

    /**
     * Listes des unités de mesure et des sources de données des indicateurs, administrables :
     * une base déjà installée les reçoit ici (le seeder est idempotent).
     */
    private function ajouterListes(): void
    {
        (new ReferenceListsSeeder)->run();
    }
};
