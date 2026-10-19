<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

/**
 * Recherche mot à mot et format de pagination communs aux listes de l'API.
 */
trait PagineEtRecherche
{
    /**
     * Chaque mot du terme doit correspondre (ilike, PostgreSQL) ; le rappel reçoit
     * une sous-requête et le motif « %mot% ».
     *
     * @param  callable(Builder, string): mixed  $parMot
     */
    protected function rechercherMots(Builder $query, ?string $terme, callable $parMot): Builder
    {
        foreach (preg_split('/\s+/u', trim((string) $terme), -1, PREG_SPLIT_NO_EMPTY) ?: [] as $mot) {
            $query->where(fn (Builder $q) => $parMot($q, '%'.$mot.'%'));
        }

        return $query;
    }

    /**
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    protected function metaPagination(LengthAwarePaginator $page, array $extra = []): array
    {
        return [
            'page' => $page->currentPage(),
            'per_page' => $page->perPage(),
            'total' => $page->total(),
            'last_page' => $page->lastPage(),
            ...$extra,
        ];
    }
}
