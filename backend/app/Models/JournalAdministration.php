<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JournalAdministration extends Model
{
    protected $table = 'journal_administration';

    public $timestamps = false;

    protected $fillable = [
        'auteur_id',
        'operation',
        'objet',
        'detail',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'detail' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function auteur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'auteur_id');
    }
}
