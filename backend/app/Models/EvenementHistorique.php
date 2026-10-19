<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

class EvenementHistorique extends Model
{
    protected $table = 'evenements_historique';

    public $timestamps = false;

    protected $fillable = [
        'fiche_id',
        'user_id',
        'type',
        'champ',
        'ancien_etat',
        'nouvel_etat',
        'commentaire',
        'version_fiche',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'ancien_etat' => 'array',
            'nouvel_etat' => 'array',
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(function (): never {
            throw new LogicException('Les événements historiques sont immuables.');
        });

        static::deleting(function (): never {
            throw new LogicException('Les événements historiques sont immuables.');
        });
    }

    public function fiche(): BelongsTo
    {
        return $this->belongsTo(FicheA3::class, 'fiche_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
