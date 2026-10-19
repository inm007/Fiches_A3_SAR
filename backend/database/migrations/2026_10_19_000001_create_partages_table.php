<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fiche et validation partagées : quand le titulaire est absent, l'administrateur
 * fonctionnel ajoute une seconde personne ; les deux voient la fiche et la font avancer.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fiche_copilotes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiche_id')->constrained('fiches_a3')->restrictOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('ajoute_par')->nullable()->constrained('users')->restrictOnDelete();
            $table->text('motif')->nullable();
            $table->timestampsTz();

            $table->unique(['fiche_id', 'user_id']);
            $table->index('user_id');
        });

        Schema::create('validation_valideurs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('validation_id')->constrained('validations')->restrictOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('ajoute_par')->nullable()->constrained('users')->restrictOnDelete();
            $table->text('motif')->nullable();
            $table->timestampsTz();

            $table->unique(['validation_id', 'user_id']);
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('validation_valideurs');
        Schema::dropIfExists('fiche_copilotes');
    }
};
