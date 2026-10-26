<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Partage d'une demande de validation avec un valideur supplémentaire.
 */
return new class extends Migration
{
    public function up(): void
    {
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
    }
};
