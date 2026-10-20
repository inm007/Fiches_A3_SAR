import { useState } from 'react'
import Button from '../../ui/Button.jsx'
import ConfirmDialog from '../../ui/ConfirmDialog.jsx'
import Badge from '../../ui/Badge.jsx'
import Modal from '../../ui/Modal.jsx'
import { Select, TextArea, TextInput } from '../../ui/FormControls.jsx'
import { listOptions, peopleOptions } from '../sections/options.js'
import { describeError, ficheService } from '../../../services/ficheService.js'
import { STATUTS_ACTION } from '../../../utils/constants.js'
import { formatDate, formatDateTime, formatFcfa } from '../../../utils/format.js'
import { toast } from '../../../utils/toast.js'
import Icon from '../../ui/Icon.jsx'
import './FicheTab.css'

const nextSteps = {
  A_FAIRE: ['EN_COURS', 'REALISE', 'BLOQUE', 'ANNULE'],
  EN_COURS: ['REALISE', 'BLOQUE', 'ANNULE'],
  BLOQUE: ['REPRENDRE', 'ANNULE'],
}

const stepLabels = { EN_COURS: 'Démarrer', REALISE: 'Réaliser', BLOQUE: 'Bloquer', ANNULE: 'Annuler', REPRENDRE: 'Reprendre' }

const NOUVELLE_ACTION = { cause_id: '', description: '', type_action: '', responsable_id: '', echeance: '', cout_estime: '', risque_id: '', motif: '' }

/**
 * Pendant le suivi, le pilote reporte une échéance ou change le responsable d'une action
 * non terminée, et ajoute une action oubliée pendant la réalisation ; le motif est obligatoire.
 */
function ReplanifierModal({ action, options, onClose, onSave }) {
  const [echeance, setEcheance] = useState(action.echeance ?? '')
  const [responsable, setResponsable] = useState(action.responsable ? String(action.responsable.id) : '')
  const [motif, setMotif] = useState('')
  const [saving, setSaving] = useState(false)
  const changed = echeance !== (action.echeance ?? '') || responsable !== (action.responsable ? String(action.responsable.id) : '')

  async function save() {
    setSaving(true)
    await onSave({ echeance: echeance || null, responsable_id: responsable ? Number(responsable) : null, motif })
    setSaving(false)
  }

  return (
    <Modal
      dirty={changed || Boolean(motif)}
      footer={({ requestClose }) => (
        <>
          <Button disabled={saving} type="button" variant="secondary" onClick={requestClose}>Annuler</Button>
          <Button disabled={!changed || !motif.trim()} loading={saving} loadingLabel="Enregistrement…" type="button" onClick={save}>Enregistrer</Button>
        </>
      )}
      open
      size="sm"
      title="Replanifier l’action"
      onClose={onClose}
    >
      <div className="fiche-tab__form">
        <p>{action.description}</p>
        <TextInput label="Échéance" required type="date" value={echeance} onChange={setEcheance} />
        <Select label="Responsable" options={peopleOptions(options?.responsables)} required value={responsable} onChange={setResponsable} />
        <TextArea hint="Inscrit dans l’historique de la fiche." label="Motif (obligatoire)" required value={motif} onChange={setMotif} />
      </div>
    </Modal>
  )
}

function AjouterActionModal({ fiche, options, refs, onClose, onSave }) {
  const [draft, setDraft] = useState(NOUVELLE_ACTION)
  const [saving, setSaving] = useState(false)
  const set = (field) => (value) => setDraft((current) => ({ ...current, [field]: value }))
  const complete = draft.cause_id && draft.description.trim() && draft.type_action && draft.responsable_id && draft.echeance && draft.motif.trim()

  async function save() {
    setSaving(true)
    await onSave({
      ...draft,
      cause_id: Number(draft.cause_id),
      responsable_id: Number(draft.responsable_id),
      cout_estime: draft.cout_estime === '' ? null : Number(draft.cout_estime),
      risque_id: draft.risque_id ? Number(draft.risque_id) : null,
    })
    setSaving(false)
  }

  return (
    <Modal
      dirty={draft !== NOUVELLE_ACTION}
      footer={({ requestClose }) => (
        <>
          <Button disabled={saving} type="button" variant="secondary" onClick={requestClose}>Annuler</Button>
          <Button disabled={!complete} loading={saving} loadingLabel="Enregistrement…" type="button" onClick={save}>Ajouter l’action</Button>
        </>
      )}
      open
      size="md"
      title="Ajouter une action au plan"
      onClose={onClose}
    >
      <div className="fiche-tab__form fiche-tab__form--grid">
        <Select label="Cause" options={fiche.analyse.causes.map((cause) => [String(cause.id), `${cause.numero}. ${cause.libelle}`])} required value={draft.cause_id} onChange={set('cause_id')} />
        <Select label="Type d’action" options={listOptions(refs, 'type_action')} required value={draft.type_action} onChange={set('type_action')} />
        <div className="fiche-tab__form-wide"><TextArea label="Description" required value={draft.description} onChange={set('description')} /></div>
        <Select label="Responsable" options={peopleOptions(options?.responsables)} required value={draft.responsable_id} onChange={set('responsable_id')} />
        <TextInput label="Échéance" required type="date" value={draft.echeance} onChange={set('echeance')} />
        <TextInput label="Coût estimé (FCFA)" min="0" type="number" value={draft.cout_estime} onChange={set('cout_estime')} />
        <Select label="MOC lié" options={fiche.risques.filter((risque) => risque.moc_requis).map((risque) => [String(risque.id), `MOC — ${risque.description}`])} placeholder="Aucun" value={draft.risque_id} onChange={set('risque_id')} />
        <div className="fiche-tab__form-wide"><TextArea hint="Pourquoi cette action s’ajoute au plan validé. Inscrit dans l’historique." label="Motif (obligatoire)" required value={draft.motif} onChange={set('motif')} /></div>
      </div>
    </Modal>
  )
}

export default function ActionsTab({ fiche, options, refs, onChange, onError }) {
  const [dialog, setDialog] = useState(null)
  const [motif, setMotif] = useState('')
  const [date, setDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [replanifiee, setReplanifiee] = useState(null)
  const [ajout, setAjout] = useState(false)
  const modifiables = fiche.droits.actions_modifiables
  const replanifiables = fiche.droits.actions_replanifiables ?? []

  async function replanifier(data) {
    try {
      onChange(await ficheService.modifierAction(replanifiee.id, data))
      toast('Action replanifiée')
      setReplanifiee(null)
    } catch (error) {
      setReplanifiee(null)
      onError(describeError(error))
    }
  }

  async function ajouter(data) {
    try {
      onChange(await ficheService.ajouterAction(fiche.id, data))
      toast('Action ajoutée ; le responsable est prévenu')
      setAjout(false)
    } catch (error) {
      setAjout(false)
      onError(describeError(error))
    }
  }

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

  async function remind(action) {
    setBusy(true)
    try {
      onChange(await ficheService.relancer('action', action.id))
      toast('Relance envoyée au responsable')
    } catch (error) {
      onError(describeError(error))
    } finally {
      setBusy(false)
    }
  }

  const start = (action, statut) => (['ANNULE', 'BLOQUE', 'REALISE'].includes(statut) ? setDialog({ action, statut }) : apply(action, statut))

  return (
    <section className="fiche-tab" data-fiche-tab="actions">
      <div className="fiche-tab__title">
        <h2>Actions</h2>
        {fiche.droits.peut_ajouter_action && <Button icon="plus" size="small" type="button" variant="secondary" onClick={() => setAjout(true)}>Ajouter une action</Button>}
      </div>
      <p className="fiche-tab__help">Une action sous MOC ne démarre qu’avec un MOC clôturé, référencé et prouvé (B1). Réaliser une action crée ses contrôles J+30, J+60 et J+90. Le pilote peut reporter une échéance ou changer un responsable avec un motif.</p>
      <table>
        <thead>
          <tr><th>Cause</th><th>Action</th><th>Responsable</th><th>Échéance</th><th>Coût</th><th>Statut</th><th>Suivi</th></tr>
        </thead>
        <tbody>
          {fiche.actions.length === 0 && <tr><td className="fiche-tab__muted" colSpan={7}>Aucune action. Le plan se construit en section 6.</td></tr>}
          {fiche.actions.map((action) => {
            const statut = STATUTS_ACTION[action.statut]
            return (
              <tr data-action-id={action.id} key={action.id}>
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
                    ? <Badge tone="retard"><Icon name="clock" size={13} />En retard</Badge>
                    : <Badge tone={statut.tone}>{statut.label}</Badge>}
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
                  {replanifiables.includes(action.id) && (
                    <div className="fiche-tab__buttons">
                      <Button disabled={busy} icon="calendar" size="small" type="button" variant="ghost" onClick={() => setReplanifiee(action)}>Replanifier</Button>
                    </div>
                  )}
                  {action.relancable && (
                    <div className="fiche-tab__buttons">
                      <Button disabled={busy} icon="bell" size="small" type="button" variant="secondary" onClick={() => remind(action)}>Relancer</Button>
                    </div>
                  )}
                  {action.derniere_relance && <div className="fiche-tab__muted">Relancée le {formatDateTime(action.derniere_relance)}</div>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {replanifiee && <ReplanifierModal action={replanifiee} options={options} onClose={() => setReplanifiee(null)} onSave={replanifier} />}
      {ajout && <AjouterActionModal fiche={fiche} options={options} refs={refs} onClose={() => setAjout(false)} onSave={ajouter} />}

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
