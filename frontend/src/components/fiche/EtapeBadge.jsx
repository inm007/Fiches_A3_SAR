import Icon from '../common/Icon.jsx'
import StatusBadge from '../common/StatusBadge.jsx'
import { ETAPES } from '../../utils/constants.js'

function EtapeBadge({ etape }) {
  const config = ETAPES[etape] ?? { label: etape, tone: 'neutral' }
  const phase = {
    OUVERT: 'opening',
    EN_COURS: 'planning',
    EN_VALIDATION_PLAN: 'planning',
    REALISATION_ACTIONS: 'realization',
    MESURE_RESULTATS: 'verification',
    VERIFICATION_MAINTIEN: 'verification',
    EN_VALIDATION_CLOTURE: 'verification',
    EN_ATTENTE: 'waiting',
    CLOTURE: 'closure',
  }[etape]
  return <StatusBadge tone={phase ? `phase-${phase}` : config.tone}>{config.label}</StatusBadge>
}

export function ConfidentialiteBadge({ value }) {
  return value === 'RESTREINT'
    ? <StatusBadge tone="restricted"><Icon name="lock" size={13} />Restreint</StatusBadge>
    : <StatusBadge tone="normal">Normal</StatusBadge>
}

export default EtapeBadge
