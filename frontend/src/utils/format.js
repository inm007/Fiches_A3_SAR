const dateFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Dakar', day: '2-digit', month: '2-digit', year: 'numeric' })
const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Dakar', dateStyle: 'short', timeStyle: 'short' })
const preciseDateTimeFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Dakar', dateStyle: 'short', timeStyle: 'medium' })
const integerFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const decimalFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })

export function formatDate(value) {
  if (!value) return '—'
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date)
}

// `secondes` : pour les journaux, où l'ordre de deux événements proches compte.
export function formatDateTime(value, { secondes = false } = {}) {
  return value ? (secondes ? preciseDateTimeFormatter : dateTimeFormatter).format(new Date(value)) : '—'
}

// « Prénom Nom » d'un utilisateur renvoyé par l'API ; null quand il n'y en a pas.
export function personName(person) {
  return person ? `${person.prenom} ${person.nom}` : null
}

export function formatFcfa(value) {
  if (value === null || value === undefined || value === '') return '—'
  return `${integerFormatter.format(Number(value))} FCFA`
}

export function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '—'
  return decimalFormatter.format(Number(value))
}

export function formatPercent(value) {
  return value === null || value === undefined ? 'Non calculable' : `${decimalFormatter.format(value)} %`
}

// Accord simple : plural(1, 'action') → « 1 action », plural(3, 'action') → « 3 actions ».
export function plural(count, singular, pluralForm = `${singular}s`) {
  const value = Number(count) || 0
  return `${integerFormatter.format(value)} ${value > 1 ? pluralForm : singular}`
}
