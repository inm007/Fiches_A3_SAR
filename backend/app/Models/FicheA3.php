<?php

namespace App\Models;

use App\Enums\StatutEtape;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOne;

class FicheA3 extends Model
{
    protected $table = 'fiches_a3';

    protected $fillable = [
        'numero_a3',
        'titre',
        'origine_id',
        'enonce_probleme',
        'unite_id',
        'equipement_id',
        'declarant_id',
        'pilote_id',
        'sponsor_id',
        'equipe',
        'type_amelioration',
        'frequence_id',
        'origine_precision',
        'date_lancement',
        'date_cible',
        'statut_etape',
        'statut_general',
        'confidentialite',
        'version',
        'cout_mise_en_oeuvre_b',
        'sans_gain_chiffre',
        'objectif_atteint',
        'date_cloture',
        'actif',
        'contexte',
        'impact_financier_estime',
        'objectif_smart',
        'perimetre',
        'resultats_attendus',
        'methode_analyse',
        'methode_precision',
        'ecart_objectif',
        'etape_avant_attente',
        'motif_attente',
        'date_resultats',
        'motif_classement',
        'departement_id',
        'pertinence_validee_le',
    ];

    protected function casts(): array
    {
        return [
            'equipe' => 'array',
            'date_lancement' => 'date',
            'date_cible' => 'date',
            'date_cloture' => 'date',
            'date_resultats' => 'date',
            'pertinence_validee_le' => 'datetime',
            'sans_gain_chiffre' => 'boolean',
            'version' => 'integer',
            'cout_mise_en_oeuvre_b' => 'integer',
            'impact_financier_estime' => 'integer',
            'actif' => 'boolean',
        ];
    }

    public function unite(): BelongsTo
    {
        return $this->belongsTo(Unite::class);
    }

    public function origine(): BelongsTo
    {
        return $this->belongsTo(ValeurListe::class, 'origine_id');
    }

    public function frequence(): BelongsTo
    {
        return $this->belongsTo(ValeurListe::class, 'frequence_id');
    }

    public function equipement(): BelongsTo
    {
        return $this->belongsTo(Equipement::class, 'equipement_id');
    }

    public function declarant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'declarant_id');
    }

    public function pilote(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pilote_id');
    }

    /**
     * Pilotes associés : la fiche est partagée, chacun voit et poursuit le travail de l'autre.
     */
    public function copilotes(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'fiche_copilotes', 'fiche_id', 'user_id')
            ->withPivot(['ajoute_par', 'motif'])
            ->withTimestamps();
    }

    /**
     * Pilote désigné puis pilotes associés.
     *
     * @return array<int, int>
     */
    public function pilotesIds(): array
    {
        return collect([$this->pilote_id])
            ->merge($this->copilotes->pluck('id'))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    public function estPilote(?int $userId): bool
    {
        return $userId !== null && in_array($userId, $this->pilotesIds(), true);
    }

    /**
     * Fiches pilotées par l'utilisateur, seul ou en partage.
     *
     * @param  Builder<FicheA3>  $query
     */
    public function scopePilotePar(Builder $query, int $userId): void
    {
        $query->where(fn (Builder $q) => $q->where('pilote_id', $userId)
            ->orWhereHas('copilotes', fn (Builder $c) => $c->where('users.id', $userId)));
    }

    /**
     * Équipe de la fiche, choisie par le pilote : les membres voient la fiche et
     * renseignent l'analyse et le suivi ; seul le pilote soumet et change d'étape.
     */
    public function membres(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'fiche_membres', 'fiche_id', 'user_id')
            ->withPivot(['ajoute_par'])
            ->withTimestamps();
    }

    public function estMembre(?int $userId): bool
    {
        return $userId !== null && $this->membres->contains('id', $userId);
    }

    /**
     * Département de l'initiateur, figé à la soumission de la pertinence (porte 0).
     */
    public function departement(): BelongsTo
    {
        return $this->belongsTo(Entite::class, 'departement_id');
    }

    public function sponsor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sponsor_id');
    }

    public function domaines(): HasMany
    {
        return $this->hasMany(FicheA3Domaine::class, 'fiche_id');
    }

    public function indicateurs(): HasMany
    {
        return $this->hasMany(FicheA3Indicateur::class, 'fiche_id');
    }

    public function impacts(): HasMany
    {
        return $this->hasMany(Impact::class, 'fiche_id');
    }

    public function causes(): HasMany
    {
        return $this->hasMany(Cause::class, 'fiche_id');
    }

    public function actions(): HasMany
    {
        return $this->hasMany(ActionA3::class, 'fiche_id');
    }

    public function risques(): HasMany
    {
        return $this->hasMany(Risque::class, 'fiche_id');
    }

    public function gains(): HasMany
    {
        return $this->hasMany(Gain::class, 'fiche_id');
    }

    public function perennisations(): HasMany
    {
        return $this->hasMany(Perennisation::class, 'fiche_id');
    }

    public function lecons(): HasMany
    {
        return $this->hasMany(Lecon::class, 'fiche_id');
    }

    public function controles(): HasManyThrough
    {
        return $this->hasManyThrough(Controle::class, ActionA3::class, 'fiche_id', 'action_id');
    }

    public function validations(): HasMany
    {
        return $this->hasMany(Validation::class, 'fiche_id');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(FicheVersion::class, 'fiche_id');
    }

    public function evenements(): HasMany
    {
        return $this->hasMany(EvenementHistorique::class, 'fiche_id');
    }

    public function commentaires(): HasMany
    {
        return $this->hasMany(Commentaire::class, 'fiche_id');
    }

    public function piecesJointes(): HasMany
    {
        return $this->hasMany(PieceJointe::class, 'fiche_id');
    }

    public function referencesSap(): HasMany
    {
        return $this->hasMany(ReferenceSap::class, 'fiche_id');
    }

    public function referenceSap(): HasOne
    {
        return $this->hasOne(ReferenceSap::class, 'fiche_id')->oldestOfMany();
    }

    public function etape(): StatutEtape
    {
        return StatutEtape::from($this->statut_etape);
    }
}
