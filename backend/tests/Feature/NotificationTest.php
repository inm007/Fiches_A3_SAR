<?php

namespace Tests\Feature;

use App\Models\Affectation;
use App\Models\FicheA3;
use App\Models\NotificationInterne;
use App\Models\Role;
use App\Models\Unite;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        config(['session.driver' => 'array']);
        config(['sanctum.stateful' => array_merge(config('sanctum.stateful'), ['localhost:5173'])]);
        $this->withHeaders(['Origin' => 'http://localhost:5173', 'Referer' => 'http://localhost:5173/']);
    }

    public function test_user_reads_counts_and_marks_only_own_notifications(): void
    {
        $unite = Unite::create(['code' => 'U-'.Str::random(6), 'libelle' => 'Unité', 'actif' => true]);
        $user = User::factory()->create(['actif' => true]);
        $other = User::factory()->create(['actif' => true]);
        $affectation = Affectation::create(['user_id' => $user->id, 'role_id' => Role::where('code', 'AGENT')->value('id'), 'unite_id' => $unite->id, 'actif' => true]);
        $fiche = FicheA3::create(['numero_a3' => 'A3-1999-'.random_int(100, 999), 'titre' => 'T', 'enonce_probleme' => 'E', 'unite_id' => $unite->id, 'declarant_id' => $user->id]);

        $mine = NotificationInterne::create(['user_id' => $user->id, 'fiche_id' => $fiche->id, 'type' => 'TEST', 'message' => 'Pour moi']);
        NotificationInterne::create(['user_id' => $user->id, 'fiche_id' => $fiche->id, 'type' => 'TEST', 'message' => 'Encore pour moi']);
        $theirs = NotificationInterne::create(['user_id' => $other->id, 'fiche_id' => $fiche->id, 'type' => 'TEST', 'message' => 'Pas pour moi']);

        $this->actingAs($user)->withSession(['auth.active_assignment_id' => $affectation->id]);

        $this->getJson('/api/notifications/non-lues')->assertOk()->assertJsonPath('data.count', 2);
        $this->getJson('/api/notifications')->assertOk()->assertJsonPath('meta.total', 2)->assertJsonPath('data.0.fiche.numero_a3', $fiche->numero_a3);
        $this->postJson("/api/notifications/{$theirs->id}/lu")->assertNotFound();
        $this->postJson("/api/notifications/{$mine->id}/lu")->assertOk();
        $this->getJson('/api/notifications/non-lues')->assertJsonPath('data.count', 1);
        $this->postJson('/api/notifications/tout-lu')->assertOk()->assertJsonPath('data.count', 1);
        $this->getJson('/api/notifications/non-lues')->assertJsonPath('data.count', 0);
    }
}
