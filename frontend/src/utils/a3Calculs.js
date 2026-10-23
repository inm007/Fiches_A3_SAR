// Calculs de la fiche A3 refaits dans le navigateur pour un retour immédiat pendant la saisie.
// Ils reprennent les formules du serveur (App\Services\Calculs), qui reste la référence à l'enregistrement.

const nombre = (value) => (value === '' || value === null || value === undefined || Number.isNaN(Number(value)) ? null : Number(value))
const arrondi = (value, decimales) => Math.round(value * 10 ** decimales) / 10 ** decimales

/** Écart entre une valeur mesurée et la cible (ou la référence) : mesurée − cible. */
export function ecart(mesuree, cible) {
  const a = nombre(mesuree)
  const b = nombre(cible)
  return a === null || b === null ? null : arrondi(a - b, 4)
}

/** Amélioration en %, positive quand l'indicateur va dans le sens souhaité. */
export function ameliorationPourcent(avant, apres, sens) {
  const a = nombre(avant)
  const b = nombre(apres)
  if (a === null || b === null || a === 0) return null
  return arrondi(((b - a) / a) * 100 * (sens === 'baisse' ? -1 : 1), 2)
}

/** La cible est-elle tenue ? En baisse : valeur ≤ cible ; en hausse : valeur ≥ cible. */
export function cibleTenue(valeur, cible, sens) {
  const a = nombre(valeur)
  const b = nombre(cible)
  if (a === null || b === null) return null
  return sens === 'baisse' ? a <= b : a >= b
}

/**
 * Objectif atteint proposé au pilote : Oui si la cible est tenue, Partiellement si
 * l'indicateur progresse sans l'atteindre, Non sinon. Le pilote confirme.
 */
export function objectifSuggere({ actuelle, cible, apres, sens }) {
  const tenue = cibleTenue(apres, cible, sens)
  if (tenue === null) return null
  if (tenue) return 'OUI'
  const progression = ameliorationPourcent(actuelle, apres, sens)
  return progression !== null && progression > 0 ? 'PARTIELLEMENT' : 'NON'
}

/** Phrase d'objectif SMART proposée à partir du KPI principal et de la date cible. */
export function proposerObjectif(indicateur, dateCible) {
  if (!indicateur?.libelle || nombre(indicateur.cible) === null) return ''
  const verbe = indicateur.sens === 'baisse' ? 'Réduire' : 'Augmenter'
  const unite = indicateur.unite_mesure ? ` ${indicateur.unite_mesure}` : ''
  const depart = nombre(indicateur.actuelle) !== null ? ` de ${indicateur.actuelle}${unite}` : ''
  const echeance = dateCible ? ` d’ici le ${dateCible.split('-').reverse().join('/')}` : ''
  return `${verbe} ${indicateur.libelle.charAt(0).toLowerCase()}${indicateur.libelle.slice(1)}${depart} à ${indicateur.cible}${unite}${echeance}, et tenir ce niveau trois mois.`
}
