<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Champs des sections 2, 4, 5 et 8 de la fiche (PRD §4.2), état de reprise après une
 * mise en attente (T13) ou un blocage d'action (D14), et contraintes des valeurs fixes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fiches_a3', function (Blueprint $table) {
            $table->text('contexte')->nullable();
            $table->unsignedBigInteger('impact_financier_estime')->nullable();
            $table->text('objectif_smart')->nullable();
            $table->text('perimetre')->nullable();
            $table->text('resultats_attendus')->nullable();
            $table->string('methode_analyse', 50)->nullable();
            $table->string('methode_precision')->nullable();
            $table->text('ecart_objectif')->nullable();
            $table->string('etape_avant_attente', 50)->nullable();
            $table->string('motif_attente')->nullable();
        });

        Schema::table('actions', function (Blueprint $table) {
            $table->string('statut_avant_blocage', 50)->nullable();
        });

        DB::statement("ALTER TABLE fiches_a3 ADD CONSTRAINT fiches_a3_etape_avant_attente_check CHECK (etape_avant_attente IS NULL OR etape_avant_attente IN ('OUVERT', 'EN_COURS', 'EN_VALIDATION_PLAN', 'REALISATION_ACTIONS', 'MESURE_RESULTATS', 'VERIFICATION_MAINTIEN', 'EN_VALIDATION_CLOTURE'))");
        DB::statement("ALTER TABLE actions ADD CONSTRAINT actions_statut_avant_blocage_check CHECK (statut_avant_blocage IS NULL OR statut_avant_blocage IN ('A_FAIRE', 'EN_COURS'))");
        DB::statement("ALTER TABLE gains ADD CONSTRAINT gains_categorie_check CHECK (categorie IN ('PRODUCTION_RECUPEREE', 'ENERGIE_ECONOMISEE', 'MAINTENANCE_EVITEE', 'NON_QUALITE_EVITEE', 'AUTRES'))");
        DB::statement("ALTER TABLE lecons ADD CONSTRAINT lecons_rubrique_check CHECK (rubrique IN ('A_FONCTIONNE', 'N_A_PAS_FONCTIONNE', 'STANDARD_A_REPLIQUER', 'RETOUR_EXPERIENCE', 'PROJET_SUIVANT'))");
        DB::statement("ALTER TABLE perennisation ADD CONSTRAINT perennisation_type_check CHECK (type IN ('SOP', 'PARAMETRES', 'FORMATION', 'PLAN_MAINTENANCE', 'KPI_TABLEAU_DE_BORD'))");
        DB::statement("ALTER TABLE perennisation ADD CONSTRAINT perennisation_statut_check CHECK (statut IN ('A_FAIRE', 'EN_COURS', 'REALISE'))");
        DB::statement("ALTER TABLE risques ADD CONSTRAINT risques_moc_statut_check CHECK (moc_statut IS NULL OR moc_statut IN ('A_OUVRIR', 'OUVERT', 'CLOTURE'))");
        DB::statement("ALTER TABLE commentaires ADD CONSTRAINT commentaires_contexte_check CHECK (contexte IN ('FICHE', 'VALIDATION', 'ACTION'))");

        // Une demande encore en attente quand un autre valideur refuse est close (ANNULE).
        DB::statement('ALTER TABLE validations DROP CONSTRAINT IF EXISTS validations_decision_check');
        DB::statement("ALTER TABLE validations ADD CONSTRAINT validations_decision_check CHECK (decision IN ('EN_ATTENTE', 'VALIDE', 'REFUSE', 'ANNULE'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE validations DROP CONSTRAINT IF EXISTS validations_decision_check');
        DB::statement("ALTER TABLE validations ADD CONSTRAINT validations_decision_check CHECK (decision IN ('EN_ATTENTE', 'VALIDE', 'REFUSE'))");
        DB::statement('ALTER TABLE commentaires DROP CONSTRAINT IF EXISTS commentaires_contexte_check');
        DB::statement('ALTER TABLE risques DROP CONSTRAINT IF EXISTS risques_moc_statut_check');
        DB::statement('ALTER TABLE perennisation DROP CONSTRAINT IF EXISTS perennisation_statut_check');
        DB::statement('ALTER TABLE perennisation DROP CONSTRAINT IF EXISTS perennisation_type_check');
        DB::statement('ALTER TABLE lecons DROP CONSTRAINT IF EXISTS lecons_rubrique_check');
        DB::statement('ALTER TABLE gains DROP CONSTRAINT IF EXISTS gains_categorie_check');
        DB::statement('ALTER TABLE actions DROP CONSTRAINT IF EXISTS actions_statut_avant_blocage_check');
        DB::statement('ALTER TABLE fiches_a3 DROP CONSTRAINT IF EXISTS fiches_a3_etape_avant_attente_check');

        Schema::table('actions', function (Blueprint $table) {
            $table->dropColumn('statut_avant_blocage');
        });

        Schema::table('fiches_a3', function (Blueprint $table) {
            $table->dropColumn([
                'contexte',
                'impact_financier_estime',
                'objectif_smart',
                'perimetre',
                'resultats_attendus',
                'methode_analyse',
                'methode_precision',
                'ecart_objectif',
                'etape_avant_attente',
                'motif_attente',
            ]);
        });
    }
};
