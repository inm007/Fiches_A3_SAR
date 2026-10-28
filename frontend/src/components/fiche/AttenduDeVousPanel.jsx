import Button from '../ui/Button.jsx'
import { PORTES } from '../../utils/constants.js'
import { plural } from '../../utils/format.js'
import './NextStepPanel.css'

/**
 * Pour qui n'est pas pilote : ce que la fiche attend de lui (une décision, ou les actions
 * qui lui sont confiées), avec un bouton qui mène au bon onglet.
 */
function AttenduDeVousPanel({ fiche, onNavigate }) {
  if (fiche.droits.est_pilote) return null

  const decision = fiche.validations.find((validation) => validation.actionnable)
  if (decision || fiche.droits.peut_decider_gains) {
    return (
      <aside className="next-step">
        <div className="next-step__head">
          <div>
            <span className="next-step__eyebrow">Votre décision est attendue</span>
            <h2>{decision ? `Porte ${decision.porte} : ${PORTES[decision.porte]}` : 'Gains à valider'}</h2>
            <p>Parcourez la fiche si besoin, puis décidez : un résumé vous est présenté avant de confirmer.</p>
          </div>
          <Button type="button" onClick={() => onNavigate({ type: 'tab', tab: 'validations' })}>Décider</Button>
        </div>
      </aside>
    )
  }

  const mesActions = fiche.actions.filter((action) => fiche.droits.actions_modifiables.includes(action.id) && !['REALISE', 'ANNULE'].includes(action.statut))
  if (mesActions.length === 0) return null
  return (
    <aside className="next-step">
      <div className="next-step__head">
        <div>
          <span className="next-step__eyebrow">Vos actions</span>
          <h2>{plural(mesActions.length, 'action vous est confiée', 'actions vous sont confiées')}</h2>
          <p>{mesActions.length > 1 ? 'Démarrez-les puis passez-les à « Réalisée » une fois faites.' : 'Démarrez-la puis passez-la à « Réalisée » une fois faite.'}</p>
        </div>
        <Button type="button" onClick={() => onNavigate({ type: 'tab', tab: 'actions', action_id: mesActions[0].id })}>Voir mes actions</Button>
      </div>
    </aside>
  )
}

export default AttenduDeVousPanel
