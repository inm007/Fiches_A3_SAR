<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Copies figées de la fiche à la soumission du plan et à la clôture.
 */
return new class extends Migration
{
    public function up(): void
    {
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
    }

    public function down(): void
    {
        Schema::dropIfExists('fiche_versions');
    }
};
