import Icon from '../common/Icon.jsx'
import StatusBadge from '../common/StatusBadge.jsx'
import { ETAPES } from '../../utils/constants.js'

function EtapeBadge({ etape }) {
  const config = ETAPES[etape] ?? { label: etape, tone: 'neutral' }
  return <StatusBadge tone={config.tone}>{config.label}</StatusBadge>
}

export function ConfidentialiteBadge({ value }) {
  return value === 'RESTREINT'
    ? <StatusBadge tone="restricted"><Icon name="lock" size={13} />Restreint</StatusBadge>
    : <StatusBadge tone="normal">Normal</StatusBadge>
}

export default EtapeBadge
