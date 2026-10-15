import Icon from './Icon.jsx'
import './EmptyState.css'

/**
 * État vide : message et, si possible, action suggérée.
 *
 * @param {object} props
 * @param {string} [props.title]
 * @param {import('react').ReactNode} [props.description]
 * @param {string} [props.icon] Icône de `Icon` ; un tiret par défaut.
 * @param {import('react').ReactNode} [props.action] Bouton ou lien proposé à l'utilisateur.
 */
function EmptyState({ title = 'Aucun élément à afficher', description, icon, action }) {
  return (
    <div className="empty-state" role="status">
      <span className="empty-state__mark" aria-hidden="true">{icon ? <Icon name={icon} size={20} /> : '—'}</span>
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  )
}

export default EmptyState
