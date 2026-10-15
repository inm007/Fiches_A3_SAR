import IconButton from './IconButton.jsx'
import './RowActions.css'

function RowActions({ actions = [], maxVisible = 3 }) {
  const visibleActions = actions.length > maxVisible ? actions.slice(0, maxVisible) : actions
  const secondaryActions = actions.length > maxVisible ? actions.slice(maxVisible) : []

  return (
    <div className="row-actions">
      {visibleActions.map((action) => (
        <IconButton
          disabled={action.disabled}
          icon={action.icon}
          key={action.label}
          label={action.label}
          onClick={action.onClick}
          tone={action.tone}
        />
      ))}
      {secondaryActions.length > 0 && (
        <details className="row-actions__menu">
          <summary aria-label="Afficher les actions supplémentaires" title="Actions supplémentaires">⋯</summary>
          <div className="row-actions__menu-items">
            {secondaryActions.map((action) => (
              <button
                disabled={action.disabled}
                key={action.label}
                onClick={action.onClick}
                type="button"
              >
                {action.label}
              </button>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

export default RowActions
