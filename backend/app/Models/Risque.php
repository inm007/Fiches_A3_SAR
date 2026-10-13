<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Risque extends Model
{
    protected $table = 'risques';

    protected $fillable = [
        'fiche_id',
        'domaine',
        'description',
        'moc_requis',
        'moc_reference',
        'moc_statut',
        'moc_preuve',
        'mesure_maitrise',
        'responsable_id',
    ];

    protected $casts = [
        'moc_requis' => 'boolean',
    ];

    public function fiche(): BelongsTo
    {
        return $this->belongsTo(FicheA3::class, 'fiche_id');
    }

    public function responsable(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsable_id');
    }

    public function actions(): HasMany
    {
        return $this->hasMany(ActionA3::class, 'risque_id');
    }
}
