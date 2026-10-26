import { useEffect, useState } from 'react'
import { describeError, ficheService } from '../../../services/ficheService.js'
import { formatDateTime } from '../../../utils/format.js'
import Skeleton from '../../ui/Skeleton.jsx'
import './FicheTab.css'

function tone(type) {
  if (['APPROBATION', 'CHANGEMENT_STATUT'].includes(type)) return 'is-ok'
  if (type === 'REFUS') return 'is-ko'
  return undefined
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
      {evenements === null && <Skeleton lines={4} />}
      {evenements?.length === 0 && <p className="fiche-tab__muted">Aucun événement.</p>}
      <ol className="sar-timeline">
        {(evenements ?? []).map((evenement) => (
          <li className={tone(evenement.type)} key={evenement.id}>
            <strong>{evenement.phrase}</strong>
            {evenement.commentaire && <span>« {evenement.commentaire} »</span>}
            <span className="fiche-tab__muted">{formatDateTime(evenement.created_at)} · boucle {evenement.version_fiche}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
