<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Impact extends Model
{
    protected $table = 'impacts';

    protected $fillable = [
        'fiche_id',
        'type_impact',
        'description',
    ];

    public function fiche(): BelongsTo
    {
        return $this->belongsTo(FicheA3::class, 'fiche_id');
    }
}
