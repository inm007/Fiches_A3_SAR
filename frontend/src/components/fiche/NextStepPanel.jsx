import { useState } from 'react'
import Button from '../ui/Button.jsx'
import Icon from '../ui/Icon.jsx'
import { describeError, ficheService } from '../../services/ficheService.js'
import { PROCHAINES_ETAPES } from '../../utils/constants.js'
import { formatDate } from '../../utils/format.js'
import { toast } from '../../utils/toast.js'
import { refreshCounters } from '../../hooks/useCounters.js'
import './NextStepPanel.css'

const ATTENTES = {
  EN_VALIDATION_PERTINENCE: 'La fiche est chez le chef de département choisi en section 4. Il peut la valider, la renvoyer à refaire (son commentaire vous revient) ou la classer sans suite.',
  EN_VALIDATION_PLAN: 'Le plan est chez les directeurs des domaines cochés, tous en même temps. Vous serez prévenu de chaque décision ; en cas de refus, la section en cause est indiquée.',
  EN_VALIDATION_CLOTURE: 'La clôture est chez le Contrôle de gestion (gains) puis le directeur sponsor, qui valide ou renvoie la fiche.',
}

/**
 * « Prochaine étape » : ce que le pilote doit encore faire pour avancer, point par point,
 * avec un lien vers l'endroit à compléter. Le serveur calcule la liste ; le bouton
 * s'active quand elle est vide.
 */
function NextStepPanel({ fiche, onChange, onError, onNavigate }) {
  const [busy, setBusy] = useState(false)
  const prochaine = fiche.prochaine_etape
  const attente = ATTENTES[fiche.statut_etape]

  if (attente && (fiche.droits.est_pilote || (fiche.statut_etape === 'EN_VALIDATION_PERTINENCE' && !fiche.droits.transitions.length))) {
    return (
      <aside className="next-step next-step--neutral">
        <h2><Icon name="clock" size={18} />En attente de validation</h2>
        <p>{attente}</p>
      </aside>
    )
  }
  if (!prochaine || !fiche.droits.transitions.includes(prochaine.code)) return null

  const etape = PROCHAINES_ETAPES[prochaine.code]
  const restants = prochaine.conditions.length
  const pret = restants === 0
  const nouvelleBoucle = fiche.droits.transitions.includes('T11') && fiche.resultats?.objectif_atteint === 'NON'

  async function avancer() {
    setBusy(true)
    try {
      const updated = await ficheService.transition(fiche.id, prochaine.code, fiche.statut_etape, null)
      onChange(updated)
      toast(`${updated.numero_a3} — étape « ${updated.statut_etape_libelle} »`)
      refreshCounters()
    } catch (error) {
      onError(describeError(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside aria-labelledby="next-step-title" className={`next-step${pret ? ' next-step--ready' : ''}`}>
      <div className="next-step__head">
        <div>
          <span className="next-step__eyebrow">Prochaine étape</span>
          <h2 id="next-step-title">{etape?.titre ?? prochaine.code}</h2>
          <p>{etape?.texte}</p>
        </div>
        <Button disabled={!pret || busy || nouvelleBoucle} loading={busy} type="button" onClick={avancer}>
          {pret ? etape?.titre : `Encore ${restants} point${restants > 1 ? 's' : ''}`}
        </Button>
      </div>
      {nouvelleBoucle && (
        <p className="next-step__alert">Objectif non atteint : lancez une nouvelle boucle (bouton en haut de la fiche) pour revoir l’analyse et le plan.</p>
      )}
      {!pret && (
        <ul className="next-step__list">
          {prochaine.conditions.map((condition, index) => (
            <li key={`${index}-${condition.message}`}>
              <Icon name="x" size={14} />
              <span>{condition.message}</span>
              {condition.emplacement && (
                <Button size="small" type="button" variant="ghost" onClick={() => onNavigate(condition.emplacement)}>{condition.emplacement.label}</Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {pret && <p className="next-step__ok"><Icon name="check" size={16} />Tout est prêt.</p>}
      {fiche.statut_etape === 'VERIFICATION_MAINTIEN' && fiche.cloture_au_plus_tot && (
        <p className="next-step__muted">Clôture possible au plus tôt le {formatDate(fiche.cloture_au_plus_tot)}, après les derniers contrôles et la mesure J+90.</p>
      )}
    </aside>
  )
}

export default NextStepPanel
