import { useEffect, useRef, useState } from 'react'
import Button from './Button.jsx'
import Icon from './Icon.jsx'
import './RowActions.css'

/**
 * Actions d'une ligne de tableau : des boutons avec leur libellé, toujours dans le même ordre
 * (« Voir », puis l'action principale) ; au-delà de `maxVisible`, les autres passent dans « Plus ».
 *
 * @param {{ label: string, icon?: string, onClick: Function, disabled?: boolean, variant?: string, tone?: string }[]} props.actions
 */
function RowActions({ actions = [], maxVisible = 2 }) {
  const visibleActions = actions.slice(0, maxVisible)
  const secondaryActions = actions.slice(maxVisible)

  return (
    // Un clic sur un bouton ne doit pas ouvrir la ligne entière (lignes cliquables).
    <div className="row-actions" onClick={(event) => event.stopPropagation()}>
      {visibleActions.map((action) => (
        <Button
          disabled={action.disabled}
          icon={action.icon}
          key={action.label}
          loading={action.loading}
          size="small"
          type="button"
          variant={action.variant ?? (action.tone === 'danger' ? 'danger' : 'secondary')}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      ))}
      {secondaryActions.length > 0 && <PlusMenu actions={secondaryActions} />}
    </div>
  )
}

function PlusMenu({ actions }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const close = (event) => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !ref.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  return (
    <div className="row-actions__menu" ref={ref}>
      <Button aria-expanded={open} aria-haspopup="menu" size="small" type="button" variant="ghost" onClick={() => setOpen((current) => !current)}>
        Plus
        <Icon name="chevron-down" size={14} />
      </Button>
      {open && (
        <div className="row-actions__menu-items" role="menu">
          {actions.map((action) => (
            <button
              className={action.tone === 'danger' ? 'is-danger' : action.tone === 'success' ? 'is-success' : undefined}
              disabled={action.disabled}
              key={action.label}
              role="menuitem"
              type="button"
              onClick={() => { setOpen(false); action.onClick() }}
            >
              {action.icon && <Icon name={action.icon} size={15} />}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default RowActions
