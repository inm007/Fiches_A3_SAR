<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
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

    /**
     * Affectations valables aujourd'hui : actives et dans leurs dates de début et de fin.
     *
     * @param  Builder<Affectation>  $query
     */
    public function scopeEnCours(Builder $query): void
    {
        $query->where('actif', true)
            ->where(fn (Builder $q) => $q->whereNull('date_debut')->orWhere('date_debut', '<=', now()))
            ->where(fn (Builder $q) => $q->whereNull('date_fin')->orWhere('date_fin', '>=', now()));
    }

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
