<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
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
    }

    public function down(): void
    {
        Schema::dropIfExists('lecons');
    }
};
