<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ActionA3 extends Model
{
    protected $table = 'actions';

    protected $fillable = [
        'fiche_id',
        'cause_id',
        'action_origine_id',
        'description',
        'type_action',
        'responsable_id',
        'echeance',
        'cout_estime',
        'statut',
        'motif_statut',
        'date_realisation',
        'risque_id',
        'statut_avant_blocage',
        'critere_efficacite',
        'preuve_realisation',
    ];

    protected function casts(): array
    {
        return [
            'echeance' => 'date',
            'date_realisation' => 'date',
            'cout_estime' => 'integer',
        ];
    }

    public function fiche(): BelongsTo
    {
        return $this->belongsTo(FicheA3::class, 'fiche_id');
    }

    public function cause(): BelongsTo
    {
        return $this->belongsTo(Cause::class, 'cause_id');
    }

    public function actionOrigine(): BelongsTo
    {
        return $this->belongsTo(self::class, 'action_origine_id');
    }

    public function actionsDerivees(): HasMany
    {
        return $this->hasMany(self::class, 'action_origine_id');
    }

    public function risque(): BelongsTo
    {
        return $this->belongsTo(Risque::class, 'risque_id');
    }

    public function responsable(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsable_id');
    }

    public function controles(): HasMany
    {
        return $this->hasMany(Controle::class, 'action_id');
    }
}
