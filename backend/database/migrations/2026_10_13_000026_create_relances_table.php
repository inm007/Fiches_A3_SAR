<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('relances', function (Blueprint $table) {
            $table->id();
            $table->string('cible_type', 100);
            $table->unsignedBigInteger('cible_id');
            $table->foreignId('auteur_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignId('destinataire_id')->constrained('users')->restrictOnDelete();
            $table->date('jour');
            $table->string('mode', 20);
            $table->timestampsTz();

            $table->unique(['cible_type', 'cible_id', 'jour']);
            $table->index(['destinataire_id', 'jour']);
        });

        DB::statement("ALTER TABLE relances ADD CONSTRAINT relances_mode_check CHECK (mode IN ('MANUELLE', 'AUTOMATIQUE'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE relances DROP CONSTRAINT IF EXISTS relances_mode_check');
        Schema::dropIfExists('relances');
    }
};
