import StatusBadge from '../common/StatusBadge.jsx'
import './FicheHeader.css'

function FicheHeader({ numero = 'A3-AAAA-NNN', titre = 'Titre de la fiche' }) {
  return (
    <header className="fiche-header">
      <div>
        <span>{numero}</span>
        <h1>{titre}</h1>
      </div>
      <StatusBadge tone="open">Ouvert</StatusBadge>
    </header>
  )
}

export default FicheHeader
