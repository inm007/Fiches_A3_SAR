// Données dérivées du tableau de bord (/tableau-de-bord) : aucun appel supplémentaire,
// chaque profil réorganise les mêmes indicateurs renvoyés par le serveur.
import { ETAPES, PARCOURS, VALIDATOR_ROLES } from '../../utils/constants.js'
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

const PHASES = [
  { code: 'ouverture', label: 'Ouverture', color: 'var(--chart-phase-opening)', stages: ['OUVERT', 'EN_VALIDATION_PERTINENCE'] },
  { code: 'plan', label: 'Planification', color: 'var(--chart-phase-planning)', stages: ['EN_COURS', 'EN_VALIDATION_PLAN'] },
  { code: 'realisation', label: 'Réalisation', color: 'var(--chart-phase-realization)', stages: ['REALISATION_ACTIONS'] },
  { code: 'verification', label: 'Vérification', color: 'var(--chart-phase-verification)', stages: ['MESURE_RESULTATS', 'VERIFICATION_MAINTIEN', 'EN_VALIDATION_CLOTURE'] },
  { code: 'cloture', label: 'Clôture', color: 'var(--chart-phase-closure)', stages: ['CLOTURE'] },
  { code: 'attente', label: 'En attente', color: 'var(--chart-phase-waiting)', stages: ['EN_ATTENTE'] },
]

const ACTION_STATUSES = [
  { code: 'A_FAIRE', label: 'À faire', color: 'var(--chart-phase-opening)' },
  { code: 'EN_COURS', label: 'En cours', color: 'var(--chart-phase-realization)' },
  { code: 'REALISE', label: 'Réalisées', color: 'var(--chart-phase-closure)' },
  { code: 'BLOQUE', label: 'Bloquées', color: 'var(--brand-500)' },
  { code: 'ANNULE', label: 'Annulées', color: 'var(--chart-phase-waiting)' },
]

/** Profil de tableau de bord : les valideurs partagent la même vue. */
export function dashboardKind(roleCode) {
  if (VALIDATOR_ROLES.includes(roleCode) || roleCode === 'CHEF_DEPARTEMENT') return 'VALIDEUR'
  return ['AGENT', 'PILOTE', 'CONTROLE_GESTION', 'DIRECTION', 'ADMIN_FONCTIONNEL'].includes(roleCode) ? roleCode : 'AGENT'
}

export function valueOf(data, path) {
  return path.split('.').reduce((current, key) => current?.[key], data)
}

export function monthLabel(month) {
  return new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' })
    .format(new Date(`${month}-01T00:00:00Z`))
    .replace('.', '')
}

/** Parcours d'une fiche : une entrée par étape (dans l'ordre), plus « En attente ». */
export function stageFlow(data) {
  return [...PARCOURS, 'EN_ATTENTE'].map((code) => ({
    code,
    label: ETAPES[code].label,
    count: Number(data?.par_etape?.[code] ?? 0),
    validation: code.startsWith('EN_VALIDATION'),
  }))
}

export function phaseGroups(data) {
  return PHASES.map((phase) => ({
    ...phase,
    count: phase.stages.reduce((total, code) => total + Number(data?.par_etape?.[code] ?? 0), 0),
  }))
}

export function actionStatuses(data) {
  return ACTION_STATUSES.map((status) => ({ ...status, count: Number(data?.actions_par_statut?.[status.code] ?? 0) }))
}

/** Âge de la plus ancienne demande de validation : vert ≤ 5 j, orange ≤ 10 j, rouge au-delà. */
export function ageTone(value) {
  if (value === null || value === undefined) return 'neutral'
  if (value <= 5) return 'success'
  return value <= 10 ? 'warning' : 'danger'
}

export function firstName(user) {
  return user?.prenom || user?.nom || ''
}

export function greeting(date = new Date()) {
  return date.getHours() < 18 ? 'Bonjour' : 'Bonsoir'
}
