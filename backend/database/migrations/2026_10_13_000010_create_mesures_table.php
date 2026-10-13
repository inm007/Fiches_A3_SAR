<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('mesures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('indicateur_id')->constrained('indicateurs')->restrictOnDelete();
            $table->string('type', 20);
            $table->decimal('valeur', 15, 4);
            $table->date('date_mesure')->nullable();
            $table->string('periode_verification')->nullable();
            $table->timestampsTz();

            $table->index(['indicateur_id', 'type']);
        });

        DB::statement("ALTER TABLE mesures ADD CONSTRAINT mesures_type_check CHECK (type IN ('REFERENCE', 'CIBLE', 'ACTUELLE', 'APRES'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE mesures DROP CONSTRAINT IF EXISTS mesures_type_check');
        Schema::dropIfExists('mesures');
    }
};
