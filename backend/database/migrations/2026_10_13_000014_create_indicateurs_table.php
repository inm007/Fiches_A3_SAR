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
        Schema::create('indicateurs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiche_id')->constrained('fiches_a3')->restrictOnDelete();
            $table->string('libelle');
            $table->string('unite_mesure', 50);
            $table->string('sens', 10)->default('hausse');
            $table->boolean('principal')->default(false);
            $table->boolean('a_ne_pas_degrader')->default(false);
            $table->string('source')->nullable();
            $table->string('periode')->nullable();
            $table->timestampsTz();

            $table->index(['fiche_id', 'principal']);
        });

        DB::statement("ALTER TABLE indicateurs ADD CONSTRAINT indicateurs_sens_check CHECK (sens IN ('hausse', 'baisse'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE indicateurs DROP CONSTRAINT IF EXISTS indicateurs_sens_check');
        Schema::dropIfExists('indicateurs');
    }
};
