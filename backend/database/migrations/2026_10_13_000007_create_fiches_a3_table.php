<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('fiches_a3', function (Blueprint $table) {
            $table->id();
            $table->string('numero_a3', 50)->unique();
            $table->string('titre');
            $table->foreignId('origine_id')->nullable()->constrained('valeurs_listes')->restrictOnDelete();
            $table->text('enonce_probleme');
            $table->foreignId('unite_id')->constrained('unites')->restrictOnDelete();
            $table->foreignId('equipement_id')->nullable()->constrained('equipements')->restrictOnDelete();
            $table->foreignId('declarant_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('pilote_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignId('sponsor_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->jsonb('equipe')->nullable();
            $table->string('type_amelioration', 50)->nullable();
            $table->foreignId('frequence_id')->nullable()->constrained('valeurs_listes')->restrictOnDelete();
            $table->string('origine_precision')->nullable();
            $table->date('date_lancement')->nullable();
            $table->date('date_cible')->nullable();
            $table->string('statut_etape', 50)->default('OUVERT');
            $table->string('statut_general', 20)->default('OUVERT');
            $table->string('confidentialite', 20)->default('NORMAL');
            $table->unsignedInteger('version')->default(1);
            $table->unsignedBigInteger('cout_mise_en_oeuvre_b')->default(0);
            $table->boolean('sans_gain_chiffre')->default(false);
            $table->string('objectif_atteint', 20)->nullable();
            $table->date('date_cloture')->nullable();
            $table->boolean('actif')->default(true);
            $table->timestampsTz();

            $table->index(['statut_general', 'unite_id']);
            $table->index(['pilote_id', 'statut_general']);
            $table->index('declarant_id');
            $table->index('date_cible');
        });

        DB::statement("ALTER TABLE fiches_a3 ADD CONSTRAINT fiches_a3_numero_format_check CHECK (numero_a3 ~ '^A3-[0-9]{4}-[0-9]{3}$')");
        DB::statement("ALTER TABLE fiches_a3 ADD CONSTRAINT fiches_a3_statut_general_check CHECK (statut_general IN ('OUVERT', 'EN_COURS', 'EN_ATTENTE', 'CLOTURE'))");
        DB::statement("ALTER TABLE fiches_a3 ADD CONSTRAINT fiches_a3_statut_etape_check CHECK (statut_etape IN ('OUVERT', 'EN_COURS', 'EN_VALIDATION_PLAN', 'REALISATION_ACTIONS', 'MESURE_RESULTATS', 'VERIFICATION_MAINTIEN', 'EN_VALIDATION_CLOTURE', 'EN_ATTENTE', 'CLOTURE'))");
        DB::statement("ALTER TABLE fiches_a3 ADD CONSTRAINT fiches_a3_confidentialite_check CHECK (confidentialite IN ('NORMAL', 'RESTREINT'))");
        DB::statement("ALTER TABLE fiches_a3 ADD CONSTRAINT fiches_a3_objectif_atteint_check CHECK (objectif_atteint IS NULL OR objectif_atteint IN ('OUI', 'PARTIELLEMENT', 'NON'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE fiches_a3 DROP CONSTRAINT IF EXISTS fiches_a3_numero_format_check');
        DB::statement('ALTER TABLE fiches_a3 DROP CONSTRAINT IF EXISTS fiches_a3_statut_general_check');
        DB::statement('ALTER TABLE fiches_a3 DROP CONSTRAINT IF EXISTS fiches_a3_statut_etape_check');
        DB::statement('ALTER TABLE fiches_a3 DROP CONSTRAINT IF EXISTS fiches_a3_confidentialite_check');
        DB::statement('ALTER TABLE fiches_a3 DROP CONSTRAINT IF EXISTS fiches_a3_objectif_atteint_check');
        Schema::dropIfExists('fiches_a3');
    }
};
