import Icon from '../ui/Icon.jsx'
import Badge from '../ui/Badge.jsx'
import { ETAPES } from '../../utils/constants.js'

// Une teinte par étape (tableau des fiches, en-tête, tableaux de bord) : on repère l'état d'un coup d'œil.
const ETAPE_TEINTE = {
  OUVERT: 'ouvert',
  EN_VALIDATION_PERTINENCE: 'validation-pertinence',
  EN_COURS: 'en-cours',
  EN_VALIDATION_PLAN: 'validation-plan',
  REALISATION_ACTIONS: 'realisation',
  MESURE_RESULTATS: 'mesure',
  VERIFICATION_MAINTIEN: 'maintien',
  EN_VALIDATION_CLOTURE: 'validation-cloture',
  EN_ATTENTE: 'attente',
  CLOTURE: 'cloture',
  CLASSE_SANS_SUITE: 'sans-suite',
}

function EtapeBadge({ etape }) {
  const label = ETAPES[etape]?.label ?? etape
  const teinte = ETAPE_TEINTE[etape]
  return <Badge tone={teinte ? `etape-${teinte}` : 'neutral'}>{label}</Badge>
}

export function ConfidentialiteBadge({ value }) {
  return value === 'RESTREINT'
    ? <Badge tone="restricted"><Icon name="lock" size={13} />Restreint</Badge>
    : <Badge tone="normal">Normal</Badge>
}

export default EtapeBadge
