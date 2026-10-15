import Button from '../ui/Button.jsx'
import Icon from '../ui/Icon.jsx'
import './MissingConditionsPanel.css'

// Panneau des refus du serveur : conditions manquantes (422) ou conflit d'état (409).
function MissingConditionsPanel({ error, onReload, onClose }) {
  if (!error) return null
  return (
    <aside className={`missing-conditions${error.conflict ? ' missing-conditions--conflict' : ''}`} role="alert">
      <h2><Icon name="al" size={18} />{error.conflict ? 'La fiche a changé entre-temps' : 'Conditions manquantes'}</h2>
      <p>{error.message}</p>
      {error.manques?.length > 0 && <ul>{error.manques.map((manque) => <li key={manque}>{manque}</li>)}</ul>}
      <footer>
        {error.conflict && onReload && <Button type="button" onClick={onReload}>Recharger</Button>}
        {onClose && <Button type="button" variant="secondary" onClick={onClose}>Fermer</Button>}
      </footer>
    </aside>
  )
}

export default MissingConditionsPanel
