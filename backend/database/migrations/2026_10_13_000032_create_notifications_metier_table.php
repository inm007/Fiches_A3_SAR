<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications_metier', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('fiche_id')->nullable()->constrained('fiches_a3')->restrictOnDelete();
            $table->string('type', 100);
            $table->text('message');
            $table->string('cible_type', 100)->nullable();
            $table->unsignedBigInteger('cible_id')->nullable();
            $table->timestampTz('lu_le')->nullable();
            $table->timestampTz('traite_le')->nullable();
            $table->timestampsTz();

            $table->index(['user_id', 'lu_le']);
            $table->index(['cible_type', 'cible_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications_metier');
    }
};
