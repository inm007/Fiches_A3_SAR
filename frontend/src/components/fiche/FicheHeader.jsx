import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../ui/Icon.jsx'
import { ETAPES, PARCOURS } from '../../utils/constants.js'
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
  const membres = fiche.membres ?? []
  const estMembre = fiche.droits?.est_membre && !fiche.droits?.est_pilote
  const sectionsEquipeOuvertes = !['OUVERT', 'EN_VALIDATION_PERTINENCE'].includes(fiche.statut_etape)
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
          {fiche.confidentialite === 'RESTREINT' && <ConfidentialiteBadge value={fiche.confidentialite} />}
          <span className="fiche-header__version" title="Une nouvelle boucle repart de l’analyse quand l’objectif n’est pas atteint.">Boucle {fiche.version}</span>
        </div>
        <ul className="fiche-header__meta">
          <li><Icon name="unit" size={15} />{identification.unite?.libelle}</li>
          <li><Icon name="user" size={15} />Pilote : {fiche.pilote?.nom ?? 'non désigné'}</li>
          {membres.length > 0 && (
            <li>
              <Icon name="users" size={15} />Équipe : {membres.map((person) => person.nom).join(', ')}
            </li>
          )}
          <li><Icon name="calendar" size={15} />Cible : {formatDate(identification.date_cible)}</li>
          {fiche.cloture_au_plus_tot && !['CLOTURE', 'CLASSE_SANS_SUITE'].includes(fiche.statut_etape) && (
            <li title="Après les derniers contrôles d’efficacité et la mesure de maintien J+90."><Icon name="clock" size={15} />Clôture au plus tôt : {formatDate(fiche.cloture_au_plus_tot)}</li>
          )}
          {identification.equipement && (
            <li>
              <Icon name="equipment" size={15} />Équipement : {identification.equipement.code}
              <Link className="fiche-header__link" title="Toutes les fiches visibles sur cet équipement" to={`/fiches?equipement_id=${identification.equipement.id}&unite_id=${identification.unite?.id ?? ''}`}>historique</Link>
            </li>
          )}
          {sap.length > 0 && <li><Icon name="lists" size={15} />SAP : {sap.join(', ')}</li>}
        </ul>
        {estMembre && (
          <p className="fiche-header__role" role="status">
            <Icon name="users" size={16} />
            <span>
              <strong>{fiche.pilote?.nom ?? 'Le pilote'}</strong> est le pilote de cette fiche ; vous faites partie de son équipe.
              {' '}{sectionsEquipeOuvertes
                ? 'Vous modifiez les sections 5 à 11. Les autres sections sont en lecture seule et seul le pilote soumet la fiche.'
                : 'Vous modifierez les sections 5 à 11 après la validation de la pertinence. Les autres sections sont en lecture seule et seul le pilote soumet la fiche.'}
            </span>
          </p>
        )}
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
        {fiche.statut_etape !== 'CLASSE_SANS_SUITE' && <ol aria-label="Progression de la fiche" className="fiche-header__progress">
          {PARCOURS.map((etape, index) => (
            <li aria-current={index === position ? 'step' : undefined} className={index < position ? 'is-done' : index === position ? 'is-current' : undefined} key={etape}>
              <span aria-hidden="true" className="fiche-header__dot">{index < position ? <Icon name="check" size={13} /> : index + 1}</span>
              <span className="fiche-header__step-label">{ETAPES[etape].label}</span>
            </li>
          ))}
        </ol>}
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
