import { useEffect, useState } from 'react'
import { describeError, ficheService } from '../../../services/ficheService.js'
import Icon from '../../ui/Icon.jsx'
import Skeleton from '../../ui/Skeleton.jsx'
import './FicheTab.css'

// Familles d'événements : une couleur et une icône chacune. « saisie » est le détail de la rédaction.
const FAMILLES = {
  etape: { label: 'Étapes', icon: 'arrow', types: ['CHANGEMENT_STATUT', 'NOUVELLE_VERSION', 'CHANGEMENT_CONFIDENTIALITE'] },
  decision: { label: 'Décisions', icon: 'validation', types: ['APPROBATION', 'REFUS', 'DECISION_GAIN', 'PARTAGE_VALIDATION', 'FIN_PARTAGE_VALIDATION', 'REATTRIBUTION_VALIDATION'] },
  action: { label: 'Actions et contrôles', icon: 'check', types: ['AJOUT_ACTION', 'STATUT_ACTION', 'REPORT_ECHEANCE', 'CHANGEMENT_RESPONSABLE', 'CONTROLE_EFFICACITE', 'RELANCE'] },
  equipe: { label: 'Équipe', icon: 'users', types: ['DESIGNATION_PILOTE', 'AJOUT_MEMBRE', 'RETRAIT_MEMBRE'] },
  fichier: { label: 'Fichiers', icon: 'file', types: ['PIECE_JOINTE_AJOUTEE', 'PIECE_JOINTE_SUPPRIMEE'] },
  saisie: { label: 'Saisie de la fiche', icon: 'edit', types: ['ENREGISTREMENT_SECTION', 'MODIFICATION_CHAMP', 'REINITIALISATION_MESURE'] },
}

const familleDe = (type) => Object.keys(FAMILLES).find((cle) => FAMILLES[cle].types.includes(type)) ?? 'saisie'

// Le commentaire n'apporte rien quand il répète la phrase (« Section 8 enregistrée ») ;
// le code de transition (« T7 — ») n'est pas parlant.
function commentaireUtile(commentaire) {
  if (!commentaire || /^Section \d+ enregistrée$/.test(commentaire)) return null
  return commentaire.replace(/^T\d+\s*—\s*/, '')
}

const jour = (iso) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const heure = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

export default function HistoriqueTab({ fiche, onError }) {
  const [evenements, setEvenements] = useState(null)
  const [tout, setTout] = useState(false)

  useEffect(() => {
    let active = true
    ficheService.historique(fiche.id)
      .then((data) => { if (active) setEvenements(data) })
      .catch((error) => { if (active) onError(describeError(error)) })
    return () => { active = false }
  }, [fiche.id, fiche.statut_etape, fiche.version, onError])

  const liste = (evenements ?? []).map((evenement) => ({ ...evenement, famille: familleDe(evenement.type) }))
  const visibles = tout ? liste : liste.filter((evenement) => evenement.famille !== 'saisie')
  const jours = visibles.reduce((groupes, evenement) => {
    const cle = jour(evenement.created_at)
    const groupe = groupes.at(-1)
    if (groupe?.cle === cle) groupe.evenements.push(evenement)
    else groupes.push({ cle, evenements: [evenement] })
    return groupes
  }, [])

  return (
    <section className="fiche-tab">
      <div className="fiche-tab__title">
        <h2>Historique</h2>
        <div className="historique__filtre" role="group" aria-label="Événements affichés">
          <button aria-pressed={!tout} type="button" onClick={() => setTout(false)}>L’essentiel <span>{liste.length - liste.filter((evenement) => evenement.famille === 'saisie').length}</span></button>
          <button aria-pressed={tout} type="button" onClick={() => setTout(true)}>Tout le détail <span>{liste.length}</span></button>
        </div>
      </div>
      <p className="fiche-tab__help">
        {tout ? 'Tout ce qui s’est passé sur la fiche, y compris chaque champ saisi.' : 'Les étapes, décisions, actions, contrôles et fichiers. « Tout le détail » ajoute chaque champ saisi.'}
      </p>
      <ul className="historique__legende" aria-label="Légende">
        {Object.entries(FAMILLES).filter(([cle]) => tout || cle !== 'saisie').map(([cle, famille]) => (
          <li className={`historique--${cle}`} key={cle}><Icon name={famille.icon} size={12} />{famille.label}</li>
        ))}
      </ul>
      {evenements === null && <Skeleton lines={4} />}
      {evenements?.length === 0 && <p className="fiche-tab__muted">Aucun événement.</p>}
      {jours.map((groupe) => (
        <div className="historique__jour" key={groupe.cle}>
          <h3>{groupe.cle}</h3>
          <ol className="historique__liste">
            {groupe.evenements.map((evenement) => {
              const commentaire = commentaireUtile(evenement.commentaire)
              return (
                <li className={`historique__evenement historique--${evenement.famille}${evenement.type === 'REFUS' ? ' historique--refus' : ''}`} key={evenement.id}>
                  <span aria-hidden="true" className="historique__pastille"><Icon name={FAMILLES[evenement.famille].icon} size={14} /></span>
                  <div>
                    <span>{evenement.phrase}</span>
                    {commentaire && <q>{commentaire}</q>}
                  </div>
                  <time dateTime={evenement.created_at}>
                    {heure(evenement.created_at)}
                    {fiche.version > 1 && <small>boucle {evenement.version_fiche}</small>}
                  </time>
                </li>
              )
            })}
          </ol>
        </div>
      ))}
    </section>
  )
}
