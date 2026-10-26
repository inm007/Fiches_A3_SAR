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
        Schema::create('fiche_domaines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiche_id')->constrained('fiches_a3')->restrictOnDelete();
            $table->string('domaine', 50);
            $table->text('precision')->nullable();
            $table->foreignId('valideur_role_id')->nullable()->constrained('roles')->restrictOnDelete();
            $table->timestampsTz();

            $table->unique(['fiche_id', 'domaine']);
            $table->index('valideur_role_id');
        });

        DB::statement("ALTER TABLE fiche_domaines ADD CONSTRAINT fiche_domaines_domaine_check CHECK (domaine IN ('QHSE', 'PROCEDE', 'FIABILITE', 'INTEGRITE', 'PRODUCTION', 'SURETE_CYBERSECURITE', 'AUTRES'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE fiche_domaines DROP CONSTRAINT IF EXISTS fiche_domaines_domaine_check');
        Schema::dropIfExists('fiche_domaines');
    }
};
