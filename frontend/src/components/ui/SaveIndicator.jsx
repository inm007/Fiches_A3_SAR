import './SaveIndicator.css'

const labels = {
  dirty: 'Modifications à enregistrer',
  saving: 'Enregistrement en cours…',
  saved: 'Enregistré',
  error: 'Échec de l’enregistrement',
}

function SaveIndicator({ state = 'dirty' }) {
  return <span className={`save-indicator save-indicator--${state}`} role="status">{labels[state]}</span>
}

export default SaveIndicator
