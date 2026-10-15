import Icon from '../ui/Icon.jsx'
import Badge from '../ui/Badge.jsx'
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
  return <Badge tone={phase ? `phase-${phase}` : config.tone}>{config.label}</Badge>
}

export function ConfidentialiteBadge({ value }) {
  return value === 'RESTREINT'
    ? <Badge tone="restricted"><Icon name="lock" size={13} />Restreint</Badge>
    : <Badge tone="normal">Normal</Badge>
}

export default EtapeBadge
