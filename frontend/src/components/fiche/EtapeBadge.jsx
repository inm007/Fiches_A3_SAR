import Icon from '../ui/Icon.jsx'
import Badge from '../ui/Badge.jsx'
import { ETAPES } from '../../utils/constants.js'

function EtapeBadge({ etape }) {
  const label = ETAPES[etape]?.label ?? etape
  const phase = {
    OUVERT: 'opening',
    EN_VALIDATION_PERTINENCE: 'opening',
    EN_COURS: 'planning',
    EN_VALIDATION_PLAN: 'planning',
    REALISATION_ACTIONS: 'realization',
    MESURE_RESULTATS: 'verification',
    VERIFICATION_MAINTIEN: 'verification',
    EN_VALIDATION_CLOTURE: 'verification',
    EN_ATTENTE: 'waiting',
    CLOTURE: 'closure',
  }[etape]
  // La couleur suit la phase du parcours ; une fiche classée sans suite reste neutre.
  return <Badge tone={phase ? `phase-${phase}` : 'neutral'}>{label}</Badge>
}

export function ConfidentialiteBadge({ value }) {
  return value === 'RESTREINT'
    ? <Badge tone="restricted"><Icon name="lock" size={13} />Restreint</Badge>
    : <Badge tone="normal">Normal</Badge>
}

export default EtapeBadge
