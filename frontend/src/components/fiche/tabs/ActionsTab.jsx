import { useState } from 'react'
import Button from '../../common/Button.jsx'
import ConfirmDialog from '../../common/ConfirmDialog.jsx'
import StatusBadge from '../../common/StatusBadge.jsx'
import { TextArea, TextInput } from '../../common/FormControls.jsx'
import { describeError, ficheService } from '../../../services/ficheService.js'
import { STATUTS_ACTION } from '../../../utils/constants.js'
import { formatDate, formatFcfa } from '../../../utils/format.js'
import { toast } from '../../../utils/toast.js'
import Icon from '../../common/Icon.jsx'
import './FicheTab.css'

const nextSteps = {
  A_FAIRE: ['EN_COURS', 'REALISE', 'BLOQUE', 'ANNULE'],
  EN_COURS: ['REALISE', 'BLOQUE', 'ANNULE'],
  BLOQUE: ['REPRENDRE', 'ANNULE'],
}

const stepLabels = { EN_COURS: 'Démarrer', REALISE: 'Réaliser', BLOQUE: 'Bloquer', ANNULE: 'Annuler', REPRENDRE: 'Reprendre' }

export default function ActionsTab({ fiche, onChange, onError }) {
  const [dialog, setDialog] = useState(null)
  const [motif, setMotif] = useState('')
  const [date, setDate] = useState('')
  const [busy, setBusy] = useState(false)
  const modifiables = fiche.droits.actions_modifiables

  async function apply(action, statut, extra = {}) {
    setBusy(true)
    try {
      onChange(await ficheService.actionStatut(action.id, { statut, ...extra }))
      toast(`Action : ${stepLabels[statut].toLowerCase()} — enregistré`)
      setDialog(null)
      setMotif('')
      setDate('')
    } catch (error) {
      setDialog(null)
      onError(describeError(error))
    } finally {
      setBusy(false)
    }
  }

  const start = (action, statut) => (['ANNULE', 'BLOQUE', 'REALISE'].includes(statut) ? setDialog({ action, statut }) : apply(action, statut))

  return (
    <section className="fiche-tab">
      <h2>Actions</h2>
      <p className="fiche-tab__help">Une action sous MOC ne démarre qu’avec un MOC clôturé, référencé et prouvé (B1). Réaliser une action crée ses contrôles J+30, J+60 et J+90.</p>
      <table>
        <thead>
          <tr><th>Cause</th><th>Action</th><th>Responsable</th><th>Échéance</th><th>Coût</th><th>Statut</th><th>Suivi</th></tr>
        </thead>
        <tbody>
          {fiche.actions.length === 0 && <tr><td className="fiche-tab__muted" colSpan={7}>Aucune action. Le plan se construit en section 6.</td></tr>}
          {fiche.actions.map((action) => {
            const statut = STATUTS_ACTION[action.statut]
            return (
              <tr key={action.id}>
                <td>{action.cause_numero ?? '—'}</td>
                <td>
                  {action.action_origine_id && <span className="fiche-tab__muted">Action corrective · </span>}
                  {action.description}
                  {action.motif_statut && <div className="fiche-tab__muted">Motif : {action.motif_statut}</div>}
                  {action.manques_moc.length > 0 && <div className="fiche-tab__late">{action.manques_moc.join(' ')}</div>}
                </td>
                <td>{action.responsable?.nom ?? '—'}</td>
                <td>{action.en_retard ? <span className="fiche-tab__late"><Icon name="clock" size={14} />{formatDate(action.echeance)}</span> : formatDate(action.echeance)}</td>
                <td>{formatFcfa(action.cout_estime)}</td>
                <td>
                  {action.en_retard
                    ? <StatusBadge tone="retard"><Icon name="clock" size={13} />En retard</StatusBadge>
                    : <StatusBadge tone={statut.tone}>{statut.label}</StatusBadge>}
                  {action.date_realisation && <div className="fiche-tab__muted">le {formatDate(action.date_realisation)}</div>}
                </td>
                <td>
                  {modifiables.includes(action.id) && (
                    <div className="fiche-tab__buttons">
                      {(nextSteps[action.statut] ?? []).map((step) => (
                        <Button disabled={busy} key={step} type="button" variant={step === 'ANNULE' || step === 'BLOQUE' ? 'danger' : 'secondary'} onClick={() => start(action, step)}>
                          {stepLabels[step]}
                        </Button>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <ConfirmDialog
        busy={busy}
        confirmLabel={dialog ? `${stepLabels[dialog.statut]} l’action` : ''}
        disabled={dialog?.statut !== 'REALISE' && !motif.trim()}
        open={Boolean(dialog)}
        title={dialog ? `${stepLabels[dialog.statut]} l’action` : ''}
        variant={dialog?.statut === 'REALISE' ? 'primary' : 'danger-solid'}
        onCancel={() => setDialog(null)}
        onConfirm={() => apply(dialog.action, dialog.statut, dialog.statut === 'REALISE' ? { date_realisation: date || null } : { motif })}
      >
        <p>{dialog?.action.description}</p>
        {dialog?.statut === 'REALISE'
          ? <TextInput hint="Aujourd’hui par défaut ; jamais dans le futur." label="Date de réalisation" type="date" value={date} onChange={setDate} />
          : <TextArea label="Motif (obligatoire)" required value={motif} onChange={setMotif} />}
      </ConfirmDialog>
    </section>
  )
}
