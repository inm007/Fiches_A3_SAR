<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CommentaireController;
use App\Http\Controllers\FicheController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ReferentielController;
use App\Http\Controllers\TableauDeBordController;
use App\Http\Controllers\TechniqueController;
use App\Http\Controllers\WorkflowController;
use App\Http\Middleware\EnsureActiveRole;
use Illuminate\Support\Facades\Route;

Route::post('/auth/connexion', [AuthController::class, 'login']);
Route::post('/auth/mot-de-passe-oublie', [AuthController::class, 'requestPasswordReset']);
Route::post('/auth/mot-de-passe', [AuthController::class, 'resetPassword']);
Route::post('/auth/deconnexion', [AuthController::class, 'logout'])->middleware('auth:sanctum');
Route::get('/auth/moi', [AuthController::class, 'me'])->middleware('auth:sanctum');
Route::post('/auth/profil-actif', [AuthController::class, 'switchProfile'])->middleware('auth:sanctum');

Route::prefix('admin')
    ->middleware(['auth:sanctum', EnsureActiveRole::class.':ADMIN_FONCTIONNEL'])
    ->controller(AdminController::class)
    ->group(function (): void {
        Route::get('/roles', 'roles');
        Route::get('/fiches', 'fiches');
        Route::patch('/fiches/{fiche}', 'updateFicheAdministration');
        Route::get('/users', 'users');
        Route::post('/users', 'createUser');
        Route::patch('/users/{user}', 'updateUser');
        Route::post('/users/{user}/password-link', 'sendPasswordLink');
        Route::get('/assignments', 'assignments');
        Route::post('/assignments', 'createAssignment');
        Route::patch('/assignments/{affectation}', 'updateAssignment');
        Route::get('/units', 'units');
        Route::post('/units', 'createUnit');
        Route::patch('/units/{unite}', 'updateUnit');
        Route::get('/equipment', 'equipment');
        Route::post('/equipment', 'createEquipment');
        Route::patch('/equipment/{equipement}', 'updateEquipment');
        Route::get('/lists', 'lists');
        Route::get('/lists/{liste}/values', 'listValues');
        Route::put('/lists/{liste}/values/order', 'reorderListValues');
        Route::post('/lists/{liste}/values', 'createListValue');
        Route::patch('/lists/{liste}/values/{valeur}', 'updateListValue');
        Route::get('/settings', 'settings');
        Route::put('/settings', 'updateSettings');
    });

Route::prefix('technique')
    ->middleware(['auth:sanctum', EnsureActiveRole::class.':ADMIN_TECHNIQUE'])
    ->controller(TechniqueController::class)
    ->group(function (): void {
        Route::get('/', 'index');
        Route::put('/settings', 'updateSetting');
    });

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/referentiels', [ReferentielController::class, 'index']);
    Route::get('/tableau-de-bord', [TableauDeBordController::class, 'index']);

    Route::get('/fiches', [FicheController::class, 'index']);
    Route::post('/fiches', [FicheController::class, 'store']);
    Route::get('/fiches/{fiche}', [FicheController::class, 'show']);
    Route::put('/fiches/{fiche}/sections/{section}', [FicheController::class, 'updateSection'])->whereNumber('section');
    Route::post('/fiches/{fiche}/confidentialite', [FicheController::class, 'updateConfidentialite']);
    Route::get('/fiches/{fiche}/historique', [FicheController::class, 'historique']);
    Route::get('/fiches/{fiche}/options', [FicheController::class, 'options']);
    Route::post('/fiches/{fiche}/transitions', [WorkflowController::class, 'transition']);
    Route::get('/fiches/{fiche}/commentaires', [CommentaireController::class, 'index']);
    Route::post('/fiches/{fiche}/commentaires', [CommentaireController::class, 'store']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/non-lues', [NotificationController::class, 'nonLues']);
    Route::post('/notifications/tout-lu', [NotificationController::class, 'toutMarquerLu']);
    Route::post('/notifications/{notification}/lu', [NotificationController::class, 'marquerLue']);

    Route::get('/validations', [WorkflowController::class, 'validations']);
    Route::post('/validations/{validation}/decision', [WorkflowController::class, 'decision']);
    Route::post('/actions/{action}/statut', [WorkflowController::class, 'actionStatut']);
    Route::patch('/controles/{controle}', [WorkflowController::class, 'controle']);
    Route::post('/gains/{gain}/decision', [WorkflowController::class, 'gain']);
});
