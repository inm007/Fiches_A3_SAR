import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Badge from '../ui/Badge.jsx'
import Icon from '../ui/Icon.jsx'
import { ETAPES, PARCOURS, STATUTS_GENERAUX } from '../../utils/constants.js'
import { formatDate } from '../../utils/format.js'
import EtapeBadge, { ConfidentialiteBadge } from './EtapeBadge.jsx'
import './FicheHeader.css'

/**
 * Rappel compact de la fiche, collé sous la barre du haut seulement quand l'en-tête complet
 * est sorti de l'écran : l'en-tête ne masque plus le contenu pendant la lecture.
 */
function useHorsEcran(ref) {
  const [horsEcran, setHorsEcran] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(([entry]) => setHorsEcran(!entry.isIntersecting), { rootMargin: '-64px 0px 0px 0px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return horsEcran
}

function FicheHeader({ fiche, children }) {
  const headerRef = useRef(null)
  const horsEcran = useHorsEcran(headerRef)
  const pilotes = [fiche.pilote, ...(fiche.copilotes ?? [])].filter(Boolean)
  const etapeCourante = fiche.statut_etape === 'EN_ATTENTE' ? fiche.etape_avant_attente : fiche.statut_etape
  const position = PARCOURS.indexOf(etapeCourante)
  const identification = fiche.identification
  const sap = [identification.numero_avis_sap && `Avis ${identification.numero_avis_sap}`, identification.numero_ordre_sap && `Ordre ${identification.numero_ordre_sap}`].filter(Boolean)

  return (
    <>
      <header className="fiche-header" ref={headerRef}>
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
          <li>
            <Icon name={pilotes.length > 1 ? 'users' : 'user'} size={15} />
            {pilotes.length > 1 ? 'Pilotes' : 'Pilote'} : {pilotes.length ? pilotes.map((person) => person.nom).join(' et ') : 'non désigné'}
            {pilotes.length > 1 && <span className="fiche-header__shared" title="Les pilotes voient ce que l’autre a fait et poursuivent la fiche ensemble.">fiche partagée</span>}
          </li>
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
      <div aria-hidden={!horsEcran} className={`fiche-header-mini${horsEcran ? ' is-visible' : ''}`}>
        <div className="fiche-header-mini__bar">
          <span className="fiche-header__numero">{fiche.numero_a3}</span>
          <strong title={fiche.titre}>{fiche.titre}</strong>
          <EtapeBadge etape={fiche.statut_etape} />
          <button className="fiche-header-mini__top" tabIndex={horsEcran ? 0 : -1} type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Haut de la fiche
          </button>
        </div>
      </div>
    </>
  )
}

export default FicheHeader
