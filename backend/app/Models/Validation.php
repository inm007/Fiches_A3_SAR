<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Validation extends Model
{
    protected $table = 'validations';

    protected $fillable = [
        'fiche_id',
        'porte',
        'role_id',
        'valideur_id',
        'decision',
        'commentaire',
        'version_fiche',
        'empreinte_domaine',
        'demandee_le',
        'decidee_le',
        'ordre',
    ];

    protected function casts(): array
    {
        return [
            'empreinte_domaine' => 'array',
            'demandee_le' => 'datetime',
            'decidee_le' => 'datetime',
        ];
    }

    public function fiche(): BelongsTo
    {
        return $this->belongsTo(FicheA3::class, 'fiche_id');
    }

    public function valideur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'valideur_id');
    }

    /**
     * Valideurs associés : la demande est partagée, le premier qui décide la traite.
     */
    public function partages(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'validation_valideurs', 'validation_id', 'user_id')
            ->withPivot(['ajoute_par', 'motif'])
            ->withTimestamps();
    }

    /**
     * @return array<int, int>
     */
    public function valideursIds(): array
    {
        return collect([$this->valideur_id])
            ->merge($this->partages->pluck('id'))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    public function estValideur(?int $userId): bool
    {
        return $userId !== null && in_array($userId, $this->valideursIds(), true);
    }

    /**
     * Demandes adressées à l'utilisateur, seul ou en partage.
     *
     * @param  Builder<Validation>  $query
     */
    public function scopePourValideur(Builder $query, int $userId): void
    {
        $query->where(fn (Builder $q) => $q->where('valideur_id', $userId)
            ->orWhereHas('partages', fn (Builder $p) => $p->where('users.id', $userId)));
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }
}
