import { Link } from 'react-router-dom'
import Badge from '../ui/Badge.jsx'
import Icon from '../ui/Icon.jsx'
import { ETAPES, PARCOURS, STATUTS_GENERAUX } from '../../utils/constants.js'
import { formatDate } from '../../utils/format.js'
import EtapeBadge, { ConfidentialiteBadge } from './EtapeBadge.jsx'
import './FicheHeader.css'

function FicheHeader({ fiche, children }) {
  const etapeCourante = fiche.statut_etape === 'EN_ATTENTE' ? fiche.etape_avant_attente : fiche.statut_etape
  const position = PARCOURS.indexOf(etapeCourante)
  const identification = fiche.identification
  const sap = [identification.numero_avis_sap && `Avis ${identification.numero_avis_sap}`, identification.numero_ordre_sap && `Ordre ${identification.numero_ordre_sap}`].filter(Boolean)

  return (
    <header className="fiche-header">
      <div className="fiche-header__top">
        <div>
          <span className="fiche-header__numero">{fiche.numero_a3}</span>
          <h1>{fiche.titre}</h1>
        </div>
        <div className="fiche-header__actions">{children}</div>
      </div>
      <div className="fiche-header__badges">
        <EtapeBadge etape={fiche.statut_etape} />
        {STATUTS_GENERAUX[fiche.statut_general] !== ETAPES[fiche.statut_etape]?.label && <Badge tone="neutral">{STATUTS_GENERAUX[fiche.statut_general]}</Badge>}
        <ConfidentialiteBadge value={fiche.confidentialite} />
        <span className="fiche-header__version">Version {fiche.version}</span>
      </div>
      <ul className="fiche-header__meta">
        <li><Icon name="unit" size={15} />{identification.unite?.libelle}</li>
        <li><Icon name="user" size={15} />Pilote : {fiche.pilote?.nom ?? 'non désigné'}</li>
        <li><Icon name="calendar" size={15} />Cible : {formatDate(identification.date_cible)}</li>
        {identification.equipement && (
          <li>
            <Icon name="equipment" size={15} />Équipement : {identification.equipement.code}
            <Link className="fiche-header__link" title="Toutes les fiches visibles sur cet équipement" to={`/fiches?equipement_id=${identification.equipement.id}&unite_id=${identification.unite?.id ?? ''}`}>historique</Link>
          </li>
        )}
        {sap.length > 0 && <li><Icon name="lists" size={15} />SAP : {sap.join(', ')}</li>}
      </ul>
      {fiche.statut_etape === 'EN_ATTENTE' && (
        <p className="fiche-header__hold" role="status">
          <Icon name="clock" size={16} />
          En attente depuis l’étape « {ETAPES[fiche.etape_avant_attente]?.label} » : {fiche.motif_attente}
        </p>
      )}
      <ol aria-label="Progression de la fiche" className="fiche-header__progress">
        {PARCOURS.map((etape, index) => (
          <li aria-current={index === position ? 'step' : undefined} className={index < position ? 'is-done' : index === position ? 'is-current' : undefined} key={etape}>
            <span aria-hidden="true" className="fiche-header__dot">{index < position ? <Icon name="check" size={13} /> : index + 1}</span>
            <span className="fiche-header__step-label">{ETAPES[etape].label}</span>
          </li>
        ))}
      </ol>
    </header>
  )
}

export default FicheHeader
