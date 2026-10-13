import './EmptyState.css'

function EmptyState({ title = 'Aucun élément à afficher', description }) {
  return (
    <div className="empty-state">
      <span className="empty-state__mark" aria-hidden="true">—</span>
      <strong>{title}</strong>
      {description && <p>{description}</p>}
    </div>
  )
}

export default EmptyState
