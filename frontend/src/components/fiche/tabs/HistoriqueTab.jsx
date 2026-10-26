import { useEffect, useState } from 'react'
import { describeError, ficheService } from '../../../services/ficheService.js'
import { ETAPES } from '../../../utils/constants.js'
import { formatDateTime } from '../../../utils/format.js'
import Skeleton from '../../ui/Skeleton.jsx'
import './FicheTab.css'

const typeLabels = {
  CHANGEMENT_STATUT: 'Changement d’étape',
  MODIFICATION_CHAMP: 'Modification de champ',
  ENREGISTREMENT_SECTION: 'Enregistrement',
  APPROBATION: 'Approbation',
  REFUS: 'Refus',
  STATUT_ACTION: 'Statut d’action',
  CONTROLE_EFFICACITE: 'Contrôle d’efficacité',
  DECISION_GAIN: 'Décision sur un gain',
  DESIGNATION_PILOTE: 'Désignation du pilote',
  CHANGEMENT_CONFIDENTIALITE: 'Confidentialité',
  NOUVELLE_VERSION: 'Nouvelle version',
  RELANCE: 'Relance',
}

function tone(type) {
  if (['APPROBATION', 'CHANGEMENT_STATUT'].includes(type)) return 'is-ok'
  if (type === 'REFUS') return 'is-ko'
  return undefined
}

function valeur(value) {
  if (value === null || value === undefined || value === '') return '∅'
  if (typeof value === 'object') return JSON.stringify(value)
  return ETAPES[value]?.label ?? String(value)
}

export default function HistoriqueTab({ fiche, onError }) {
  const [evenements, setEvenements] = useState(null)

  useEffect(() => {
    let active = true
    ficheService.historique(fiche.id)
      .then((data) => { if (active) setEvenements(data) })
      .catch((error) => { if (active) onError(describeError(error)) })
    return () => { active = false }
  }, [fiche.id, fiche.statut_etape, fiche.version, onError])

  return (
    <section className="fiche-tab">
      <h2>Historique</h2>
      <p className="fiche-tab__help">Journal immuable : aucun utilisateur ne peut le modifier ou le supprimer.</p>
      {evenements === null && <Skeleton lines={4} />}
      {evenements?.length === 0 && <p className="fiche-tab__muted">Aucun événement.</p>}
      <ol className="sar-timeline">
        {(evenements ?? []).map((evenement) => (
          <li className={tone(evenement.type)} key={evenement.id}>
            <strong>
              {typeLabels[evenement.type] ?? evenement.type}
              {evenement.champ && evenement.type === 'MODIFICATION_CHAMP' && ` : ${evenement.champ}`}
            </strong>
            {(evenement.ancienne_valeur !== null || evenement.nouvelle_valeur !== null) && (
              <span>{valeur(evenement.ancienne_valeur)} → {valeur(evenement.nouvelle_valeur)}</span>
            )}
            {evenement.commentaire && <span>{evenement.commentaire}</span>}
            <span className="fiche-tab__muted">{evenement.auteur} · {formatDateTime(evenement.created_at)} · v{evenement.version_fiche}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
