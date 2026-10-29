import { useEffect, useRef, useState } from 'react'
import Button from './Button.jsx'
import Icon from './Icon.jsx'
import './RowActions.css'

const ACTION_ICONS = {
  voir: 'eye',
  consulter: 'eye',
  ouvrir: 'eye',
  modifier: 'edit',
  éditer: 'edit',
  editer: 'edit',
  gérer: 'set',
  gerer: 'set',
  supprimer: 'x',
  retirer: 'x',
  désactiver: 'disable',
  desactiver: 'disable',
  réactiver: 'enable',
  reactiver: 'enable',
  activer: 'enable',
  télécharger: 'download',
  telecharger: 'download',
  valider: 'check',
  approuver: 'check',
  refuser: 'x',
  relancer: 'bell',
}

function iconForAction(action) {
  return action.icon ?? ACTION_ICONS[action.label.toLocaleLowerCase('fr')]
}

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
          className={`row-actions__button${action.label.toLocaleLowerCase('fr') === 'voir' ? ' row-actions__button--view' : ''}`}
          disabled={action.disabled}
          icon={iconForAction(action)}
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
      <Button
        aria-label="Plus d’actions"
        aria-expanded={open}
        aria-haspopup="menu"
        className={`row-actions__more${open ? ' is-open' : ''}`}
        icon="more-horizontal"
        size="small"
        title="Plus d’actions"
        type="button"
        variant="ghost"
        onClick={() => setOpen((current) => !current)}
      />
      {open && (
        <div className="row-actions__menu-items" role="menu">
          {actions.map((action) => (
            <button
              className={action.tone === 'danger' || action.variant === 'danger' || action.variant === 'danger-solid'
                ? 'is-danger'
                : action.tone === 'success' || action.variant === 'success'
                  ? 'is-success'
                  : undefined}
              disabled={action.disabled}
              key={action.label}
              role="menuitem"
              type="button"
              onClick={() => { setOpen(false); action.onClick() }}
            >
              {iconForAction(action) && <Icon name={iconForAction(action)} size={15} />}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default RowActions
