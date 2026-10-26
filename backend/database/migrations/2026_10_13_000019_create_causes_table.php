<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('causes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiche_id')->constrained('fiches_a3')->restrictOnDelete();
            $table->unsignedInteger('numero');
            $table->string('categorie', 50);
            $table->text('libelle');
            $table->unsignedInteger('niveau')->default(1);
            $table->boolean('racine')->default(false);
            $table->text('preuve')->nullable();
            $table->timestampsTz();

            $table->unique(['fiche_id', 'numero']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('causes');
    }
};
