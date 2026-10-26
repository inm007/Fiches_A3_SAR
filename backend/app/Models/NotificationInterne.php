<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationInterne extends Model
{
    protected $table = 'notifications_metier';

    protected $fillable = [
        'user_id',
        'fiche_id',
        'type',
        'message',
        'cible_type',
        'cible_id',
        'lu_le',
        'traite_le',
    ];

    protected function casts(): array
    {
        return [
            'lu_le' => 'datetime',
            'traite_le' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function fiche(): BelongsTo
    {
        return $this->belongsTo(FicheA3::class, 'fiche_id');
    }
}
