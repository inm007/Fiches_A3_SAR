import './SaveIndicator.css'

const labels = {
  dirty: 'Modifications non enregistrées',
  saving: 'Enregistrement…',
  saved: 'Enregistré',
  error: 'Échec de l’enregistrement',
}

function SaveIndicator({ state = 'dirty' }) {
  return <span className={`save-indicator save-indicator--${state}`} role="status">{labels[state]}</span>
}

export default SaveIndicator
