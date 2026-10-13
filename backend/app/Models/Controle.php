<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Controle extends Model
{
    protected $table = 'controles';

    protected $fillable = [
        'action_id',
        'jalon',
        'date_reference',
        'date_echeance',
        'date_effective',
        'resultat',
        'commentaire',
        'preuve',
        'controleur_id',
        'action_corrective_id',
    ];

    protected $casts = [
        'date_reference' => 'date',
        'date_echeance' => 'date',
        'date_effective' => 'date',
    ];

    public function action(): BelongsTo
    {
        return $this->belongsTo(ActionA3::class, 'action_id');
    }

    public function actionCorrective(): BelongsTo
    {
        return $this->belongsTo(ActionA3::class, 'action_corrective_id');
    }

    public function controleur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'controleur_id');
    }
}
