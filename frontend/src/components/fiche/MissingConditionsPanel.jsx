import Button from '../ui/Button.jsx'
import Icon from '../ui/Icon.jsx'
import './MissingConditionsPanel.css'

// Panneau des refus du serveur : conditions manquantes (422) ou conflit d'état (409).
function MissingConditionsPanel({ error, onReload, onClose, onNavigate }) {
  if (!error) return null
  return (
    <aside className={`missing-conditions${error.conflict ? ' missing-conditions--conflict' : ''}`} role="alert">
      <h2><Icon name="al" size={18} />{error.conflict ? 'La fiche a changé entre-temps' : 'Conditions manquantes'}</h2>
      <p>{error.message}</p>
      {error.manques?.length > 0 && (
        <ul>
          {error.manques.map((manque, index) => {
            const emplacement = error.emplacements?.find((item) => item.index === index)
            return (
              <li className="missing-conditions__item" key={`${index}-${manque}`}>
                <span>{manque}</span>
                {emplacement && onNavigate && (
                  <Button size="small" type="button" variant="secondary" onClick={() => onNavigate(emplacement)}>
                    {emplacement.label}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <footer>
        {error.conflict && onReload && <Button type="button" onClick={onReload}>Recharger</Button>}
        {onClose && <Button type="button" variant="secondary" onClick={onClose}>Fermer</Button>}
      </footer>
    </aside>
  )
}

export default MissingConditionsPanel
