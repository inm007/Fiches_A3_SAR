// Données dérivées du tableau de bord (/tableau-de-bord) : aucun appel supplémentaire,
// chaque profil réorganise les mêmes indicateurs renvoyés par le serveur.
import { VALIDATOR_ROLES } from '../../utils/constants.js'
import { formatFcfa } from '../../utils/format.js'

export const percent = (value) => (value === null || value === undefined ? '—' : `${String(Math.round(value * 10) / 10).replace('.', ',')} %`)
export const days = (value) => (value === null || value === undefined ? '—' : `${value} j`)
export const shortFcfa = (value) => (Math.abs(value) >= 1_000_000
  ? `${(value / 1_000_000).toFixed(1).replace('.', ',')} M FCFA`
  : formatFcfa(value))

export const TODO_TYPES = {
  validation: { label: 'Validation', plural: 'Validations', icon: 'validation', tone: 'violet' },
  retard: { label: 'Action en retard', plural: 'Actions en retard', icon: 'al', tone: 'red' },
  controle: { label: 'Contrôle', plural: 'Contrôles', icon: 'clock', tone: 'teal' },
  pilote: { label: 'Désignation pilote', plural: 'Pilotes à désigner', icon: 'users', tone: 'green' },
  reattribution: { label: 'Validation bloquée', plural: 'Validations à réattribuer', icon: 'validation', tone: 'red' },
}

/** Profil de tableau de bord : les valideurs partagent la même vue. */
export function dashboardKind(roleCode) {
  if (VALIDATOR_ROLES.includes(roleCode) || roleCode === 'CHEF_DEPARTEMENT') return 'VALIDEUR'
  return ['AGENT', 'PILOTE', 'CONTROLE_GESTION', 'DIRECTION', 'ADMIN_FONCTIONNEL'].includes(roleCode) ? roleCode : 'AGENT'
}

export function firstName(user) {
  return user?.prenom || user?.nom || ''
}

export function greeting(date = new Date()) {
  return date.getHours() < 18 ? 'Bonjour' : 'Bonsoir'
}
