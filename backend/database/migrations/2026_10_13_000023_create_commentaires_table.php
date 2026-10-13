<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commentaires', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiche_id')->constrained('fiches_a3')->restrictOnDelete();
            $table->foreignId('auteur_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('contexte', 50)->default('FICHE');
            $table->unsignedBigInteger('objet_id')->nullable();
            $table->text('texte');
            $table->timestampsTz();

            $table->index(['contexte', 'objet_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commentaires');
    }
};
