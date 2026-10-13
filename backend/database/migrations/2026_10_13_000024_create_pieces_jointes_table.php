<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pieces_jointes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiche_id')->constrained('fiches_a3')->restrictOnDelete();
            $table->string('objet_type', 100)->nullable();
            $table->unsignedBigInteger('objet_id')->nullable();
            $table->string('nom_origine');
            $table->string('nom_stockage')->unique();
            $table->string('type_mime', 100);
            $table->unsignedBigInteger('taille');
            $table->string('empreinte', 128)->nullable();
            $table->foreignId('auteur_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestampsTz();

            $table->index(['objet_type', 'objet_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pieces_jointes');
    }
};
