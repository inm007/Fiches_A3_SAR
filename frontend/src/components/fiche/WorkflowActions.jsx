import { useState } from 'react'
import Button from '../common/Button.jsx'
import ConfirmDialog from '../common/ConfirmDialog.jsx'
import { Select, TextArea } from '../common/FormControls.jsx'
import { describeError, ficheService } from '../../services/ficheService.js'
import { TRANSITIONS } from '../../utils/constants.js'
import { toast } from '../../utils/toast.js'
import { refreshCounters } from '../../hooks/useCounters.js'
import { peopleOptions } from './sections/options.js'
import './WorkflowActions.css'

/**
 * Boutons selon l'étape et le profil actif (UX §8.2). Le serveur reste seul juge :
 * un refus revient en 422 (manques) ou 409 (fiche modifiée) et s'affiche dans le panneau.
 */
function WorkflowActions({ fiche, options, onChange, onError }) {
  const [dialog, setDialog] = useState(null)
  const [motif, setMotif] = useState('')
  const [pilote, setPilote] = useState('')
  const [busy, setBusy] = useState(false)
  const droits = fiche.droits

  async function run(task, message) {
    setBusy(true)
    try {
      const updated = await task()
      onChange(updated)
      setDialog(null)
      setMotif('')
      toast(message ?? `${updated.numero_a3} — étape « ${updated.statut_etape_libelle} »`)
      refreshCounters()
    } catch (error) {
      setDialog(null)
      onError(describeError(error))
    } finally {
      setBusy(false)
    }
  }

  const transition = (code) => run(() => ficheService.transition(fiche.id, code, fiche.statut_etape, motif || null))
  const startTransition = (code) => (TRANSITIONS[code].motif ? setDialog({ type: 'transition', code }) : transition(code))

  async function designer() {
    await run(async () => {
      await ficheService.designerPilote(fiche.id, Number(pilote))
      return ficheService.get(fiche.id)
    }, 'Pilote désigné')
  }

  async function basculerConfidentialite() {
    const cible = fiche.confidentialite === 'RESTREINT' ? 'NORMAL' : 'RESTREINT'
    await run(async () => {
      if (droits.est_pilote) return ficheService.confidentialite(fiche.id, cible, motif || null)
      await ficheService.confidentialiteAdmin(fiche.id, cible)
      return ficheService.get(fiche.id)
    }, `Confidentialité : ${cible === 'RESTREINT' ? 'Restreint' : 'Normal'}`)
  }

  return (
    <div aria-label="Actions du workflow" className="workflow-actions">
      {droits.peut_designer_pilote && <Button type="button" onClick={() => setDialog({ type: 'pilote' })}>{fiche.pilote ? 'Changer le pilote' : 'Désigner le pilote'}</Button>}
      {droits.transitions.map((code) => (
        <Button disabled={busy} key={code} type="button" variant={TRANSITIONS[code].primary ? 'primary' : 'secondary'} onClick={() => startTransition(code)}>
          {TRANSITIONS[code].label}
        </Button>
      ))}
      {droits.peut_changer_confidentialite && (
        <Button type="button" variant="secondary" onClick={() => setDialog({ type: 'confidentialite' })}>
          {fiche.confidentialite === 'RESTREINT' ? 'Passer en Normal' : 'Passer en Restreint'}
        </Button>
      )}

      <ConfirmDialog
        busy={busy}
        confirmLabel={dialog?.code ? TRANSITIONS[dialog.code].label : 'Confirmer'}
        disabled={!motif.trim()}
        open={dialog?.type === 'transition'}
        title={dialog?.code ? TRANSITIONS[dialog.code].label : ''}
        variant={dialog?.code === 'T12' ? 'danger-solid' : 'primary'}
        onCancel={() => setDialog(null)}
        onConfirm={() => transition(dialog.code)}
      >
        <TextArea label={dialog?.code ? TRANSITIONS[dialog.code].motif : ''} required value={motif} onChange={setMotif} />
      </ConfirmDialog>

      <ConfirmDialog
        busy={busy}
        confirmLabel="Désigner le pilote"
        disabled={!pilote}
        open={dialog?.type === 'pilote'}
        title="Désigner le pilote"
        variant="primary"
        onCancel={() => setDialog(null)}
        onConfirm={designer}
      >
        <Select
          hint="Titulaires du rôle Pilote dans l’unité de la fiche."
          label="Pilote"
          options={peopleOptions(options?.pilotes)}
          required
          value={pilote}
          onChange={setPilote}
        />
      </ConfirmDialog>

      <ConfirmDialog
        busy={busy}
        confirmLabel={fiche.confidentialite === 'RESTREINT' ? 'Passer en Normal' : 'Passer en Restreint'}
        open={dialog?.type === 'confidentialite'}
        title="Changer la confidentialité"
        variant="primary"
        onCancel={() => setDialog(null)}
        onConfirm={basculerConfidentialite}
      >
        <p>Une fiche Restreint n’est visible que des profils autorisés. Le changement est journalisé.</p>
        {droits.est_pilote && <TextArea label="Motif (conseillé)" value={motif} onChange={setMotif} />}
      </ConfirmDialog>
    </div>
  )
}

export default WorkflowActions
