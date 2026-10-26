import { useState } from 'react'

/**
 * Recherche, filtres et pagination d'une liste : changer un filtre ou la taille
 * de page ramène à la première page, « Réinitialiser » revient aux valeurs par défaut.
 *
 * @param {object} defaults Filtres vides, ex. { q: '', etat: '' }.
 * @param {object|() => object} [initial] Filtres au premier affichage (par défaut `defaults`).
 * @param {number} [initialPageSize] Taille de page au premier affichage (10 par défaut).
 */
export function useListFilters(defaults, initial = defaults, initialPageSize = 10) {
  const [filters, setFilters] = useState(initial)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)

  return {
    filters,
    page,
    pageSize,
    setPage,
    active: Object.values(filters).some((value) => value !== '' && value !== undefined && value !== null),
    setFilter: (name) => (value) => {
      setFilters((current) => ({ ...current, [name]: value }))
      setPage(1)
    },
    updateFilters: (changes) => {
      setFilters((current) => ({ ...current, ...changes }))
      setPage(1)
    },
    changePageSize: (size) => {
      setPageSize(size)
      setPage(1)
    },
    reset: () => {
      setFilters(defaults)
      setPage(1)
    },
  }
}
