<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evenements_historique', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiche_id')->constrained('fiches_a3')->restrictOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('type', 100);
            $table->string('champ')->nullable();
            $table->jsonb('ancien_etat')->nullable();
            $table->jsonb('nouvel_etat')->nullable();
            $table->text('commentaire')->nullable();
            $table->unsignedInteger('version_fiche')->nullable();
            $table->timestampTz('created_at')->useCurrent();

            $table->index(['fiche_id', 'created_at']);
        });

        DB::statement('DROP FUNCTION IF EXISTS refuser_modification_evenements_historique()');

        DB::unprepared(<<<'SQL'
            CREATE FUNCTION refuser_modification_evenements_historique()
            RETURNS trigger AS $$
            BEGIN
                RAISE EXCEPTION 'evenements_historique is immutable';
            END;
            $$ LANGUAGE plpgsql;

            CREATE TRIGGER evenements_historique_immuable
            BEFORE UPDATE OR DELETE ON evenements_historique
            FOR EACH ROW EXECUTE FUNCTION refuser_modification_evenements_historique();
        SQL);
    }

    public function down(): void
    {
        DB::unprepared('DROP TRIGGER IF EXISTS evenements_historique_immuable ON evenements_historique');
        DB::unprepared('DROP FUNCTION IF EXISTS refuser_modification_evenements_historique()');
        Schema::dropIfExists('evenements_historique');
    }
};
