import { Link } from 'react-router-dom'
import Badge from '../ui/Badge.jsx'
import Icon from '../ui/Icon.jsx'
import { ETAPES, PARCOURS } from '../../utils/constants.js'
import { formatDate } from '../../utils/format.js'
import EtapeBadge from './EtapeBadge.jsx'
import './FicheHeader.css'

/**
 * En-tête de la fiche : numéro, titre, étape et les quelques repères utiles.
 * Le bouton de l'étape suivante est dans le panneau « Prochaine étape », juste dessous.
 */
function FicheHeader({ fiche, children }) {
  const pilotes = [fiche.pilote, ...(fiche.copilotes ?? [])].filter(Boolean)
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
        {position >= 0 && fiche.statut_etape !== 'CLASSE_SANS_SUITE' && (
          <span className="fiche-header__step" title={PARCOURS.map((etape) => ETAPES[etape].label).join(' → ')}>
            Étape {position + 1} sur {PARCOURS.length}
          </span>
        )}
        {fiche.confidentialite === 'RESTREINT' && <Badge tone="restricted"><Icon name="lock" size={13} />Restreint</Badge>}
        {fiche.version > 1 && <span className="fiche-header__step" title="Une nouvelle boucle repart de l’analyse quand l’objectif n’est pas atteint.">Boucle {fiche.version}</span>}
      </div>
      <ul className="fiche-header__meta">
        <li>{identification.unite?.libelle}</li>
        <li>
          {pilotes.length > 1 ? 'Pilotes' : 'Pilote'} : {pilotes.length ? pilotes.map((person) => person.nom).join(' et ') : 'non désigné'}
        </li>
        <li>Cible : {formatDate(identification.date_cible)}</li>
        {fiche.cloture_au_plus_tot && !['CLOTURE', 'CLASSE_SANS_SUITE'].includes(fiche.statut_etape) && (
          <li title="Après les derniers contrôles d’efficacité et la mesure de maintien J+90.">Clôture au plus tôt : {formatDate(fiche.cloture_au_plus_tot)}</li>
        )}
        {identification.equipement && (
          <li>
            <Link title="Toutes les fiches visibles sur cet équipement" to={`/fiches?equipement_id=${identification.equipement.id}&unite_id=${identification.unite?.id ?? ''}`}>
              {identification.equipement.code}
            </Link>
          </li>
        )}
        {sap.length > 0 && <li>SAP {sap.join(', ')}</li>}
      </ul>
      {fiche.statut_etape === 'EN_ATTENTE' && (
        <p className="fiche-header__hold" role="status">
          <Icon name="clock" size={16} />
          En attente depuis l’étape « {ETAPES[fiche.etape_avant_attente]?.label} » : {fiche.motif_attente}
        </p>
      )}
      {fiche.statut_etape === 'CLASSE_SANS_SUITE' && (
        <p className="fiche-header__hold" role="status">
          <Icon name="info" size={16} />
          Classée sans suite : {fiche.motif_classement}
        </p>
      )}
    </header>
  )
}

export default FicheHeader
