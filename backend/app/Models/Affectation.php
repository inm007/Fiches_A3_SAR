<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Affectation extends Model
{
    protected $table = 'affectations';

    protected $fillable = [
        'user_id',
        'role_id',
        'unite_id',
        'actif',
        'date_debut',
        'date_fin',
    ];

    protected $casts = [
        'actif' => 'boolean',
        'date_debut' => 'datetime',
        'date_fin' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function unite(): BelongsTo
    {
        return $this->belongsTo(Unite::class);
    }
}
