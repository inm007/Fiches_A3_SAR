<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('controles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('action_id')->constrained('actions')->restrictOnDelete();
            $table->string('jalon', 20);
            $table->date('date_reference');
            $table->date('date_echeance');
            $table->date('date_effective')->nullable();
            $table->string('resultat', 20)->nullable();
            $table->text('commentaire')->nullable();
            $table->string('preuve')->nullable();
            $table->foreignId('controleur_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignId('action_corrective_id')->nullable()->constrained('actions')->restrictOnDelete();
            $table->timestampsTz();

            $table->index(['action_id', 'jalon']);
            $table->index('date_echeance');
        });

        DB::statement("ALTER TABLE controles ADD CONSTRAINT controles_jalon_check CHECK (jalon IN ('J30', 'J60', 'J90', 'CORRECTIF'))");
        DB::statement("ALTER TABLE controles ADD CONSTRAINT controles_resultat_check CHECK (resultat IS NULL OR resultat IN ('CONFORME', 'NON_CONFORME'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE controles DROP CONSTRAINT IF EXISTS controles_jalon_check');
        DB::statement('ALTER TABLE controles DROP CONSTRAINT IF EXISTS controles_resultat_check');
        Schema::dropIfExists('controles');
    }
};
