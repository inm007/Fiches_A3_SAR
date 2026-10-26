<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['identifiant', 'nom', 'prenom', 'email', 'password', 'auth_source', 'ldap_dn', 'actif', 'derniere_connexion', 'entite_id'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'actif' => 'boolean',
            'derniere_connexion' => 'datetime',
        ];
    }

    /**
     * « Prénom Nom », tel qu'affiché dans les listes, l'historique et les commentaires.
     */
    protected function nomComplet(): Attribute
    {
        return Attribute::get(fn (): string => trim($this->prenom.' '.$this->nom));
    }

    /**
     * Entité de rattachement dans l'organigramme (service, département ou direction).
     */
    public function entite(): BelongsTo
    {
        return $this->belongsTo(Entite::class);
    }

    public function affectations(): HasMany
    {
        return $this->hasMany(Affectation::class, 'user_id');
    }

    public function validations(): HasMany
    {
        return $this->hasMany(Validation::class, 'valideur_id');
    }
}
