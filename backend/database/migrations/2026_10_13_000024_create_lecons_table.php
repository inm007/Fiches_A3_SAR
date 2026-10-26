<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lecons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiche_id')->constrained('fiches_a3')->restrictOnDelete();
            $table->string('rubrique', 50);
            $table->text('texte');
            $table->timestampsTz();
        });

        DB::statement("ALTER TABLE lecons ADD CONSTRAINT lecons_rubrique_check CHECK (rubrique IN ('A_FONCTIONNE', 'N_A_PAS_FONCTIONNE', 'STANDARD_A_REPLIQUER', 'RETOUR_EXPERIENCE', 'PROJET_SUIVANT'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('lecons');
    }
};
