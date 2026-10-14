// Options des listes déroulantes à partir de /referentiels et /fiches/{id}/options.

export function listOptions(refs, code, key = 'code') {
  return (refs?.listes?.[code] ?? []).map((valeur) => [String(valeur[key]), valeur.libelle])
}

export function peopleOptions(people = []) {
  return people.map((person) => [String(person.id), person.nom])
}
