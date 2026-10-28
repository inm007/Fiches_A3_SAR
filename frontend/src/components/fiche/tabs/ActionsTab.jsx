import { useState } from 'react'
import Button from '../../ui/Button.jsx'
import DataTable from '../../ui/DataTable.jsx'
import DetailsModal from '../../ui/DetailsModal.jsx'
import RowActions from '../../ui/RowActions.jsx'
import ConfirmDialog from '../../ui/ConfirmDialog.jsx'
import Badge from '../../ui/Badge.jsx'
import FileInput from '../../ui/FileInput.jsx'
import Modal from '../../ui/Modal.jsx'
import { FICHIERS_ACCEPTES } from '../JoindrePreuve.jsx'
import { Select, TextArea, TextInput } from '../../ui/FormControls.jsx'
import { listOptions, peopleOptions } from '../sections/options.js'
import { describeError, ficheService } from '../../../services/ficheService.js'
import { STATUTS_ACTION } from '../../../utils/constants.js'
import { detailItems } from '../../../utils/details.js'
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

function StatutAction({ action }) {
  if (action.en_retard) return <Badge tone="retard"><Icon name="clock" size={13} />En retard</Badge>
  const statut = STATUTS_ACTION[action.statut]
  return <Badge tone={statut.tone}>{statut.label}</Badge>
}

// Le tableau garde l'essentiel ; critère, preuve, motif, coût et relances s'ouvrent avec « Voir ».
const colonnes = [
  { key: 'cause_numero', label: 'Cause', width: '72px', value: (action) => action.cause_numero ?? '—' },
  {
    key: 'description',
    label: 'Action',
    render: (action) => (
      <span className="fiche-tab__action">
        <span className="data-table__cell-text" title={action.description}>
          {action.action_origine_id && <span className="fiche-tab__muted">Action corrective · </span>}
          {action.description}
        </span>
        {action.manques_moc.length > 0 && <small className="fiche-tab__late">{action.manques_moc.join(' ')}</small>}
      </span>
    ),
    detailValue: (action) => action.description,
  },
  { key: 'responsable', label: 'Responsable', width: '16%', value: (action) => action.responsable?.nom ?? '—' },
  {
    key: 'echeance',
    label: 'Échéance',
    width: '140px',
    render: (action) => (action.en_retard
      ? <span className="fiche-tab__late"><Icon name="clock" size={14} />{formatDate(action.echeance)}</span>
      : formatDate(action.echeance)),
  },
  { key: 'statut', label: 'Statut', width: '128px', render: (action) => <StatutAction action={action} /> },
  { key: 'origine', label: 'Origine', detailOnly: true, value: (action) => (action.action_origine_id ? 'Action corrective (contrôle d’efficacité)' : 'Plan d’actions') },
  { key: 'critere_efficacite', label: 'Critère d’efficacité', detailOnly: true },
  { key: 'cout_estime', label: 'Coût estimé', detailOnly: true, value: (action) => formatFcfa(action.cout_estime) },
  { key: 'date_realisation', label: 'Réalisée le', detailOnly: true, value: (action) => (action.date_realisation ? formatDate(action.date_realisation) : null) },
  { key: 'preuve_realisation', label: 'Preuve de réalisation', detailOnly: true },
  { key: 'motif_statut', label: 'Motif (blocage, annulation)', detailOnly: true },
  { key: 'manques_moc', label: 'MOC', detailOnly: true, value: (action) => action.manques_moc.join(' ') || null },
  { key: 'derniere_relance', label: 'Dernière relance', detailOnly: true, value: (action) => (action.derniere_relance ? formatDateTime(action.derniere_relance) : null) },
]

const NOUVELLE_ACTION = { cause_id: '', description: '', type_action: '', responsable_id: '', echeance: '', cout_estime: '', risque_id: '', critere_efficacite: '', motif: '' }

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
  const complete = draft.cause_id && draft.description.trim() && draft.type_action && draft.responsable_id && draft.echeance && draft.critere_efficacite.trim() && draft.motif.trim()

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
        <div className="fiche-tab__form-wide"><TextArea hint="Ce que vous vérifierez aux contrôles J+30, J+60 et J+90." label="Critère d’efficacité : comment saurez-vous qu’elle a marché ?" required value={draft.critere_efficacite} onChange={set('critere_efficacite')} /></div>
        <div className="fiche-tab__form-wide"><TextArea hint="Pourquoi cette action s’ajoute au plan validé. Inscrit dans l’historique." label="Motif (obligatoire)" required value={draft.motif} onChange={set('motif')} /></div>
      </div>
    </Modal>
  )
}

export default function ActionsTab({ fiche, options, refs, onChange, onError }) {
  const [dialog, setDialog] = useState(null)
  const [motif, setMotif] = useState('')
  const [date, setDate] = useState('')
  const [preuve, setPreuve] = useState('')
  const [fichier, setFichier] = useState(null)
  const [busy, setBusy] = useState(false)
  const [replanifiee, setReplanifiee] = useState(null)
  const [ajout, setAjout] = useState(false)
  const [vue, setVue] = useState(null)
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

  async function apply(action, statut, extra = {}, piece = null) {
    setBusy(true)
    try {
      // Le fichier part d'abord : s'il est refusé (format, taille), l'action ne change pas de statut.
      if (piece) await ficheService.ajouterPieceJointe(fiche.id, piece, { actionId: action.id })
      onChange(await ficheService.actionStatut(action.id, { statut, ...extra }))
      toast(`Action : ${stepLabels[statut].toLowerCase()} — enregistré`)
      setDialog(null)
      setMotif('')
      setDate('')
      setPreuve('')
      setFichier(null)
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

  // Voir, puis l'étape suivante la plus courante ; les autres choix passent dans « Plus ».
  function actionsDe(action) {
    const boutons = [{ icon: 'eye', label: 'Voir', onClick: () => setVue(action) }]
    if (modifiables.includes(action.id)) {
      (nextSteps[action.statut] ?? []).forEach((step) => boutons.push({
        disabled: busy,
        label: stepLabels[step],
        tone: step === 'ANNULE' || step === 'BLOQUE' ? 'danger' : undefined,
        onClick: () => start(action, step),
      }))
    }
    if (action.relancable) boutons.push({ disabled: busy, icon: 'bell', label: 'Relancer', onClick: () => remind(action) })
    if (replanifiables.includes(action.id)) boutons.push({ disabled: busy, icon: 'calendar', label: 'Replanifier', onClick: () => setReplanifiee(action) })
    return boutons
  }

  const start = (action, statut) => (['ANNULE', 'BLOQUE', 'REALISE'].includes(statut) ? setDialog({ action, statut }) : apply(action, statut))

  return (
    <section className="fiche-tab" data-fiche-tab="actions">
      <div className="fiche-tab__title">
        <h2>Actions</h2>
        {fiche.droits.peut_ajouter_action && <Button icon="plus" size="small" type="button" variant="secondary" onClick={() => setAjout(true)}>Ajouter une action</Button>}
      </div>
      <p className="fiche-tab__help">
        Démarrez chaque action, puis passez-la à « Réalisée » (preuve facultative). Une action sous MOC attend le MOC clôturé.
      </p>
      <DataTable
        actions={(action) => <RowActions actions={actionsDe(action)} />}
        actionsWidth="280px"
        columns={colonnes}
        emptyDescription="Le plan se construit en section 6."
        emptyMessage="Aucune action."
        rowProps={(action) => ({ 'data-action-id': action.id })}
        rows={fiche.actions}
        variant="compact"
      />
      <DetailsModal
        items={vue ? detailItems(colonnes, vue) : []}
        open={Boolean(vue)}
        subtitle={vue?.cause_numero ? `Cause ${vue.cause_numero}` : undefined}
        title="Détail de l’action"
        onClose={() => setVue(null)}
      />

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
        onConfirm={() => apply(dialog.action, dialog.statut, dialog.statut === 'REALISE' ? { date_realisation: date || null, preuve: preuve.trim() || null } : { motif }, dialog.statut === 'REALISE' ? fichier : null)}
      >
        <p>{dialog?.action.description}</p>
        {dialog?.statut === 'REALISE' ? (
          <>
            {dialog.action.critere_efficacite && <p className="fiche-tab__muted">Critère d’efficacité : {dialog.action.critere_efficacite}</p>}
            <TextArea hint="Facultatif : n° de bon de travaux, compte rendu…" label="Preuve de réalisation" value={preuve} onChange={setPreuve} />
            {fiche.droits.peut_ajouter_piece_jointe && <FileInput accept={FICHIERS_ACCEPTES} file={fichier} label="Document ou photo (facultatif)" onChange={setFichier} />}
            <TextInput hint="Aujourd’hui par défaut ; jamais dans le futur." label="Date de réalisation" type="date" value={date} onChange={setDate} />
          </>
        ) : <TextArea label="Motif (obligatoire)" required value={motif} onChange={setMotif} />}
      </ConfirmDialog>
    </section>
  )
}
