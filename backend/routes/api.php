<?php

use App\Http\Controllers\Admin\AffectationController;
use App\Http\Controllers\Admin\EquipementController;
use App\Http\Controllers\Admin\FicheAdminController;
use App\Http\Controllers\Admin\ListeController;
use App\Http\Controllers\Admin\ParametreController;
use App\Http\Controllers\Admin\TechniqueController;
use App\Http\Controllers\Admin\UniteController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CommentaireController;
use App\Http\Controllers\FicheController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PieceJointeController;
use App\Http\Controllers\ReferentielController;
use App\Http\Controllers\RelanceController;
use App\Http\Controllers\TableauDeBordController;
use App\Http\Controllers\WorkflowController;
use App\Http\Middleware\EnsureActiveRole;
use Illuminate\Support\Facades\Route;

Route::post('/auth/connexion', [AuthController::class, 'login']);
Route::post('/auth/mot-de-passe-oublie', [AuthController::class, 'requestPasswordReset']);
Route::post('/auth/mot-de-passe', [AuthController::class, 'resetPassword']);
Route::post('/auth/deconnexion', [AuthController::class, 'logout'])->middleware('auth:sanctum');
Route::get('/auth/moi', [AuthController::class, 'me'])->middleware('auth:sanctum');
Route::post('/auth/profil-actif', [AuthController::class, 'switchProfile'])->middleware('auth:sanctum');

// Administration fonctionnelle : un contrôleur par écran.
Route::prefix('admin')
    ->middleware(['auth:sanctum', EnsureActiveRole::class.':ADMIN_FONCTIONNEL'])
    ->group(function (): void {
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::patch('/users/{user}', [UserController::class, 'update']);
        Route::post('/users/{user}/password-link', [UserController::class, 'sendPasswordLink']);

        Route::get('/roles', [AffectationController::class, 'roles']);
        Route::get('/assignments', [AffectationController::class, 'index']);
        Route::post('/assignments', [AffectationController::class, 'store']);
        Route::patch('/assignments/{affectation}', [AffectationController::class, 'update']);

        Route::get('/units', [UniteController::class, 'index']);
        Route::post('/units', [UniteController::class, 'store']);
        Route::patch('/units/{unite}', [UniteController::class, 'update']);

        Route::get('/equipment', [EquipementController::class, 'index']);
        Route::post('/equipment', [EquipementController::class, 'store']);
        Route::patch('/equipment/{equipement}', [EquipementController::class, 'update']);

        Route::get('/lists', [ListeController::class, 'index']);
        Route::get('/lists/{liste}/values', [ListeController::class, 'valeurs']);
        Route::post('/lists/{liste}/values', [ListeController::class, 'storeValeur']);
        Route::put('/lists/{liste}/values/order', [ListeController::class, 'reordonner']);
        Route::patch('/lists/{liste}/values/{valeur}', [ListeController::class, 'updateValeur']);

        Route::get('/settings', [ParametreController::class, 'index']);
        Route::put('/settings', [ParametreController::class, 'update']);

        Route::get('/fiches', [FicheAdminController::class, 'index']);
        Route::patch('/fiches/{fiche}', [FicheAdminController::class, 'update']);
    });

Route::prefix('technique')
    ->middleware(['auth:sanctum', EnsureActiveRole::class.':ADMIN_TECHNIQUE'])
    ->controller(TechniqueController::class)
    ->group(function (): void {
        Route::get('/', 'index');
        Route::get('/logs', 'logs');
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
    Route::get('/fiches/{fiche}/pieces-jointes', [PieceJointeController::class, 'index']);
    Route::post('/fiches/{fiche}/pieces-jointes', [PieceJointeController::class, 'store']);
    Route::get('/fiches/{fiche}/commentaires', [CommentaireController::class, 'index']);
    Route::post('/fiches/{fiche}/commentaires', [CommentaireController::class, 'store']);
    Route::get('/pieces-jointes/{pieceJointe}/telechargement', [PieceJointeController::class, 'download']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/non-lues', [NotificationController::class, 'nonLues']);
    Route::post('/notifications/tout-lu', [NotificationController::class, 'toutMarquerLu']);
    Route::post('/notifications/{notification}/lu', [NotificationController::class, 'marquerLue']);

    Route::get('/validations', [WorkflowController::class, 'validations']);
    Route::post('/validations/{validation}/decision', [WorkflowController::class, 'decision']);
    Route::post('/actions/{action}/statut', [WorkflowController::class, 'actionStatut']);
    Route::patch('/controles/{controle}', [WorkflowController::class, 'controle']);
    Route::post('/gains/{gain}/decision', [WorkflowController::class, 'gain']);
    Route::post('/relances', [RelanceController::class, 'store']);
});
