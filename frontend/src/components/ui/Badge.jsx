import Icon from './Icon.jsx'
import './Badge.css'

/**
 * Pastille de statut unique de l'application : texte coloré sur fond pâle,
 * avec un point coloré, ou une icône quand `icon` est fourni.
 *
 * @param {object} props
 * @param {string} [props.tone='neutral'] Teinte : neutral, success, error, warning, brand,
 *   active, inactive, teintes de suivi (encours, validation, realisation, maintien, attente), d'action (a-faire, realisee…)
 *   ou phases (phase-opening, phase-planning…).
 * @param {string} [props.icon] Nom d'icône de `Icon`.
 * @param {import('react').ReactNode} props.children
 */
function Badge({ children, tone = 'neutral', icon }) {
  return (
    <span className={`status-badge status-badge--${tone}`}>
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  )
}

export default Badge
