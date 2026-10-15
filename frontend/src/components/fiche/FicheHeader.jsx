import Badge from '../ui/Badge.jsx'
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
        <Badge tone="neutral">{STATUTS_GENERAUX[fiche.statut_general]}</Badge>
        <ConfidentialiteBadge value={fiche.confidentialite} />
        <span className="fiche-header__version">v{fiche.version}</span>
      </div>
      <p className="fiche-header__meta">
        {identification.unite?.libelle} · Pilote : {fiche.pilote?.nom ?? 'non désigné'} · Cible : {formatDate(identification.date_cible)}
        {identification.equipement && ` · Équipement : ${identification.equipement.code}`}
        {sap.length > 0 && ` · SAP : ${sap.join(', ')}`}
      </p>
      {fiche.statut_etape === 'EN_ATTENTE' && (
        <p className="fiche-header__hold" role="status">
          En attente depuis l’étape « {ETAPES[fiche.etape_avant_attente]?.label} » : {fiche.motif_attente}
        </p>
      )}
      <ol aria-label="Progression de la fiche" className="fiche-header__progress">
        {PARCOURS.map((etape, index) => (
          <li className={index < position ? 'is-done' : index === position ? 'is-current' : undefined} key={etape}>
            {ETAPES[etape].label}
          </li>
        ))}
      </ol>
    </header>
  )
}

export default FicheHeader
