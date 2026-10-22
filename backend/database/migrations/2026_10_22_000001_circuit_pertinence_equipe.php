<?php

use Database\Seeders\CircuitSeeder;
use Database\Seeders\RolesSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Retours de la réunion du 20 octobre 2026 : organigramme (direction, département, service)
 * pour router la validation de pertinence vers le chef de département de l'initiateur,
 * porte 0, équipe de la fiche, correspondance domaine → directeurs modifiable et
 * précision du domaine « Autres ».
 */
return new class extends Migration
{
    private const array ETAPES = ['OUVERT', 'EN_COURS', 'EN_VALIDATION_PLAN', 'REALISATION_ACTIONS', 'MESURE_RESULTATS', 'VERIFICATION_MAINTIEN', 'EN_VALIDATION_CLOTURE', 'EN_ATTENTE', 'CLOTURE', 'CLASSE_SANS_SUITE'];

    private const array ETAPES_AVANT_ATTENTE = ['OUVERT', 'EN_COURS', 'EN_VALIDATION_PLAN', 'REALISATION_ACTIONS', 'MESURE_RESULTATS', 'VERIFICATION_MAINTIEN', 'EN_VALIDATION_CLOTURE'];

    public function up(): void
    {
        Schema::create('entites', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('libelle');
            $table->string('type', 20);
            $table->foreignId('parent_id')->nullable()->constrained('entites')->restrictOnDelete();
            $table->foreignId('responsable_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->boolean('actif')->default(true);
            $table->timestampsTz();
            $table->index('parent_id');
            $table->index('responsable_id');
        });
        DB::statement("ALTER TABLE entites ADD CONSTRAINT entites_type_check CHECK (type IN ('DIRECTION', 'DEPARTEMENT', 'SERVICE'))");

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('entite_id')->nullable()->constrained('entites')->restrictOnDelete();
        });

        Schema::table('fiches_a3', function (Blueprint $table) {
            $table->foreignId('departement_id')->nullable()->constrained('entites')->restrictOnDelete();
            $table->timestampTz('pertinence_validee_le')->nullable();
        });
        $this->contrainte('fiches_a3', 'fiches_a3_statut_etape_check', 'statut_etape', [...self::ETAPES, 'EN_VALIDATION_PERTINENCE']);
        $this->contrainte('fiches_a3', 'fiches_a3_etape_avant_attente_check', 'etape_avant_attente', [...self::ETAPES_AVANT_ATTENTE, 'EN_VALIDATION_PERTINENCE'], nullable: true);

        DB::statement('ALTER TABLE validations DROP CONSTRAINT IF EXISTS validations_porte_check');
        DB::statement('ALTER TABLE validations ADD CONSTRAINT validations_porte_check CHECK (porte IN (0, 1, 2))');

        Schema::create('fiche_membres', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiche_id')->constrained('fiches_a3')->restrictOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('ajoute_par')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestampsTz();
            $table->unique(['fiche_id', 'user_id']);
            $table->index('user_id');
        });

        Schema::create('domaine_roles', function (Blueprint $table) {
            $table->id();
            $table->string('domaine', 50);
            $table->foreignId('role_id')->constrained('roles')->restrictOnDelete();
            $table->timestampsTz();
            $table->unique(['domaine', 'role_id']);
        });

        Schema::table('fiche_domaines', function (Blueprint $table) {
            $table->text('precision')->nullable();
        });

        // Une base déjà installée reçoit les nouveaux rôles et la correspondance par défaut.
        (new RolesSeeder)->run();
        (new CircuitSeeder)->run();
    }

    public function down(): void
    {
        Schema::table('fiche_domaines', fn (Blueprint $table) => $table->dropColumn('precision'));
        Schema::dropIfExists('domaine_roles');
        Schema::dropIfExists('fiche_membres');
        DB::table('validations')->where('porte', 0)->delete();
        DB::statement('ALTER TABLE validations DROP CONSTRAINT IF EXISTS validations_porte_check');
        DB::statement('ALTER TABLE validations ADD CONSTRAINT validations_porte_check CHECK (porte IN (1, 2))');
        DB::table('fiches_a3')->where('statut_etape', 'EN_VALIDATION_PERTINENCE')->update(['statut_etape' => 'OUVERT']);
        DB::table('fiches_a3')->where('etape_avant_attente', 'EN_VALIDATION_PERTINENCE')->update(['etape_avant_attente' => 'OUVERT']);
        $this->contrainte('fiches_a3', 'fiches_a3_statut_etape_check', 'statut_etape', self::ETAPES);
        $this->contrainte('fiches_a3', 'fiches_a3_etape_avant_attente_check', 'etape_avant_attente', self::ETAPES_AVANT_ATTENTE, nullable: true);
        Schema::table('fiches_a3', function (Blueprint $table) {
            $table->dropConstrainedForeignId('departement_id');
            $table->dropColumn('pertinence_validee_le');
        });
        Schema::table('users', fn (Blueprint $table) => $table->dropConstrainedForeignId('entite_id'));
        Schema::dropIfExists('entites');
    }

    /**
     * @param  array<int, string>  $valeurs
     */
    private function contrainte(string $table, string $nom, string $colonne, array $valeurs, bool $nullable = false): void
    {
        DB::statement("ALTER TABLE {$table} DROP CONSTRAINT IF EXISTS {$nom}");
        $liste = implode(', ', array_map(fn (string $valeur) => "'{$valeur}'", $valeurs));
        $condition = $nullable ? "{$colonne} IS NULL OR {$colonne} IN ({$liste})" : "{$colonne} IN ({$liste})";
        DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$nom} CHECK ({$condition})");
    }
};
