<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('valeurs_listes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('liste_id')->constrained('listes')->restrictOnDelete();
            $table->string('code');
            $table->string('libelle');
            $table->integer('ordre')->default(0);
            $table->boolean('actif')->default(true);
            $table->timestampsTz();

            $table->unique(['liste_id', 'code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('valeurs_listes');
    }
};
