// Options des listes déroulantes à partir de /referentiels et /fiches/{id}/options.

export const CODES_AUTRE = ['AUTRE', 'AUTRES']

// Les options créées depuis une fiche (parent_id) se rangent sous « Autre » : la liste principale ne les montre pas.
export function listOptions(refs, code, key = 'code') {
  return (refs?.listes?.[code] ?? []).filter((valeur) => !valeur.parent_id).map((valeur) => [String(valeur[key]), valeur.libelle])
}

export function peopleOptions(people = []) {
  return people.map((person) => [String(person.id), person.nom])
}

/** La valeur « Autre » d'une liste et les options rangées dessous. */
export function optionsAutre(refs, code) {
  const valeurs = refs?.listes?.[code] ?? []
  const autre = valeurs.find((valeur) => !valeur.parent_id && CODES_AUTRE.includes(valeur.code)) ?? null
  return { autre, sousOptions: autre ? valeurs.filter((valeur) => valeur.parent_id === autre.id) : [] }
}

/** Référentiels avec une option de plus, sans attendre un nouveau chargement. */
export function avecOption(refs, code, valeur) {
  const valeurs = refs?.listes?.[code] ?? []
  if (valeurs.some((existante) => existante.id === valeur.id)) return refs
  return { ...refs, listes: { ...refs.listes, [code]: [...valeurs, valeur] } }
}

// Même mise en forme et même détection des doublons que le serveur (ReferentielController).
export function mettreEnForme(libelle) {
  const propre = libelle.trim().replace(/\s+/gu, ' ').replace(/[\s.,;:!?\-–]+$/u, '')
  return propre.charAt(0).toLocaleUpperCase('fr') + propre.slice(1)
}

export function cleOption(libelle) {
  return libelle
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/œ/gi, 'oe').replace(/æ/gi, 'ae')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((mot) => (mot.length > 3 ? mot.replace(/s+$/, '') : mot))
    .join('')
}

const LIBELLES_VAGUES = ['autre', 'autres', 'divers', 'na', 'nc', 'inconnu', 'aucun', 'rien', 'test', 'nouveau', 'nouvelle']

/**
 * Contrôle d'une option avant création : `erreurs` bloquent, `conseils` signalent un écart aux usages.
 * `doublon` est l'option déjà présente dans la liste, s'il y en a une.
 */
export function verifierOption(saisie, valeurs = []) {
  const libelle = mettreEnForme(saisie)
  const cle = cleOption(libelle)
  const erreurs = []
  const conseils = []
  if (libelle.length < 3) erreurs.push('Au moins 3 caractères.')
  if (libelle.length > 60) erreurs.push('60 caractères au plus.')
  if (libelle && !/\p{L}/u.test(libelle)) erreurs.push('Au moins un mot.')
  if (LIBELLES_VAGUES.map(cleOption).includes(cle)) erreurs.push('Trop vague : nommez précisément l’option.')
  if (libelle.split(' ').length > 5) conseils.push('Plus de 5 mots : gardez le nom de la catégorie et laissez le détail à la fiche.')
  if (/\p{L}{6,}/u.test(libelle) && libelle === libelle.toLocaleUpperCase('fr')) conseils.push('Évitez les majuscules partout : seuls les sigles (SAP, HSE) restent en capitales.')
  if (/\b[\p{L}]{1,4}\./u.test(libelle)) conseils.push('Évitez les abréviations : écrivez le mot en entier.')
  const doublon = cle ? valeurs.find((valeur) => cleOption(valeur.libelle) === cle) ?? null : null
  return { libelle, erreurs, conseils, doublon }
}
