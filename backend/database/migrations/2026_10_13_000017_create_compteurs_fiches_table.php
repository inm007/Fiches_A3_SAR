<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('compteurs_fiches', function (Blueprint $table) {
            $table->integer('annee')->primary();
            $table->integer('derniere_valeur')->default(0);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('compteurs_fiches');
    }
};
