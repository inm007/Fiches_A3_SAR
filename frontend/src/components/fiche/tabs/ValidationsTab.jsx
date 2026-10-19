import { useState } from 'react'
import Alert from '../../ui/Alert.jsx'
import Button from '../../ui/Button.jsx'
import ConfirmDialog from '../../ui/ConfirmDialog.jsx'
import Badge from '../../ui/Badge.jsx'
import { Select, TextArea } from '../../ui/FormControls.jsx'
import { refreshCounters } from '../../../hooks/useCounters.js'
import { describeError, ficheService } from '../../../services/ficheService.js'
import { DECISIONS, STATUTS_GAIN } from '../../../utils/constants.js'
import { formatDate, formatDateTime, formatFcfa, plural } from '../../../utils/format.js'
import { toast } from '../../../utils/toast.js'
import './FicheTab.css'

const tones = { EN_ATTENTE: 'warning', VALIDE: 'success', REFUSE: 'error', ANNULE: 'neutral' }
const steps = { EN_ATTENTE: 'is-wait', VALIDE: 'is-ok', REFUSE: 'is-ko' }

export default function ValidationsTab({ fiche, onChange, onError }) {
  const [dialog, setDialog] = useState(null)
  const [commentaire, setCommentaire] = useState('')
  const [retour, setRetour] = useState('VERIFICATION_MAINTIEN')
  const [busy, setBusy] = useState(false)
  const enAttente = fiche.validations.filter((validation) => validation.decision === 'EN_ATTENTE')
  const plusAncienne = enAttente.reduce((oldest, validation) => (validation.anciennete_jours > (oldest?.anciennete_jours ?? -1) ? validation : oldest), null)
  const porte2 = fiche.validations.some((validation) => validation.porte === 2)

  async function run(task, message) {
    setBusy(true)
    try {
      onChange(await task())
      toast(message)
      refreshCounters()
      setDialog(null)
      setCommentaire('')
    } catch (error) {
      setDialog(null)
      onError(describeError(error))
    } finally {
      setBusy(false)
    }
  }

  const decide = (validation, decision) => run(() => ficheService.decision(validation.id, {
    decision,
    commentaire: commentaire || null,
    retour: validation.porte === 2 ? retour : null,
  }), decision === 'VALIDE' ? 'Demande approuvée' : 'Refus enregistré — le pilote est notifié')

  return (
    <section className="fiche-tab">
      <h2>Validations</h2>
      {plusAncienne && (
        <Alert severity="warning">
          Demande « {plusAncienne.role?.libelle} » en attente depuis <b>{plural(plusAncienne.anciennete_jours, 'jour')}</b>. Aucun délai imposé.
        </Alert>
      )}

      {fiche.droits.peut_decider_gains && (
        <div>
          <h3>Gains à valider</h3>
          <table>
            <thead><tr><th>Catégorie</th><th>Hypothèse</th><th>Montant annuel</th><th>Statut</th><th>Décision</th></tr></thead>
            <tbody>
              {fiche.gains.lignes.map((gain) => (
                <tr key={gain.id}>
                  <td>{gain.categorie_libelle}</td>
                  <td>{gain.hypothese_calcul}</td>
                  <td><b>{formatFcfa(gain.montant_annuel)}</b></td>
                  <td>{STATUTS_GAIN[gain.statut]}</td>
                  <td className="fiche-tab__buttons">
                    <Button disabled={busy || gain.statut === 'VALIDE'} size="small" type="button" variant="success" onClick={() => run(() => ficheService.decisionGain(gain.id, 'VALIDE'), 'Gain validé')}>Valider</Button>
                    <Button disabled={busy || gain.statut === 'REFUSE'} size="small" type="button" variant="danger" onClick={() => run(() => ficheService.decisionGain(gain.id, 'REFUSE'), 'Gain refusé')}>Refuser</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ol className="sar-timeline">
        {fiche.validations.length === 0 && (
          <li><b>Porte 1 — Production / Exploitation, puis les domaines cochés</b><span className="fiche-tab__muted">À la soumission du plan</span></li>
        )}
        {fiche.validations.map((validation) => (
          <li className={steps[validation.decision]} key={validation.id}>
            <span>
              <b>Porte {validation.porte} — {validation.role?.libelle}</b>{' '}
              <Badge tone={tones[validation.decision]}>{DECISIONS[validation.decision]}</Badge>
            </span>
            <span className="fiche-tab__muted">
              {validation.valideur?.nom}{validation.decision === 'EN_ATTENTE' && validation.partages?.length > 0 && ` (partagée avec ${validation.partages.map((person) => person.nom).join(', ')})`} · demandé le {formatDate(validation.demandee_le)}
              {validation.decidee_le && ` · décidé le ${formatDate(validation.decidee_le)}`}
              {validation.decision === 'EN_ATTENTE' && ` · ${validation.anciennete_jours} j`} · v{validation.version_fiche}
            </span>
            {validation.commentaire && <span>« {validation.commentaire} »</span>}
            {validation.decision === 'EN_ATTENTE' && validation.derniere_relance && (
              <span className="fiche-tab__muted">Relancé le {formatDateTime(validation.derniere_relance)}</span>
            )}
            {validation.relancable && (
              <span className="fiche-tab__buttons">
                <Button disabled={busy} icon="bell" size="small" type="button" variant="secondary" onClick={() => run(() => ficheService.relancer('validation', validation.id), 'Relance envoyée au valideur')}>Relancer</Button>
              </span>
            )}
            {validation.actionnable && (
              <span className="fiche-tab__buttons">
                <Button disabled={busy} size="small" type="button" variant="success" onClick={() => setDialog({ validation, decision: 'VALIDE' })}>Approuver</Button>
                <Button disabled={busy} size="small" type="button" variant="danger" onClick={() => setDialog({ validation, decision: 'REFUSE' })}>Refuser</Button>
              </span>
            )}
          </li>
        ))}
        {fiche.validations.length > 0 && !porte2 && (
          <li><b>Porte 2 — Contrôle de gestion (si gains), puis Direction</b><span className="fiche-tab__muted">Après les mesures et les contrôles</span></li>
        )}
      </ol>

      <ConfirmDialog
        busy={busy}
        confirmLabel={dialog?.decision === 'REFUSE' ? 'Confirmer le refus' : 'Approuver'}
        disabled={dialog?.decision === 'REFUSE' && !commentaire.trim()}
        open={Boolean(dialog)}
        title={dialog?.decision === 'REFUSE' ? 'Refuser la demande' : 'Approuver la demande'}
        variant={dialog?.decision === 'REFUSE' ? 'danger-solid' : 'primary'}
        onCancel={() => setDialog(null)}
        onConfirm={() => decide(dialog.validation, dialog.decision)}
      >
        {dialog?.decision === 'REFUSE' && <p className="fiche-tab__muted">Un commentaire est obligatoire (règle B6).</p>}
        <TextArea label={dialog?.decision === 'REFUSE' ? 'Motif du refus' : 'Commentaire'} required={dialog?.decision === 'REFUSE'} value={commentaire} onChange={setCommentaire} />
        {dialog?.decision === 'REFUSE' && dialog.validation.porte === 2 && (
          <Select
            label="Retour à l’étape"
            options={[['VERIFICATION_MAINTIEN', 'Vérification du maintien'], ['MESURE_RESULTATS', 'Mesure des résultats']]}
            required
            value={retour}
            onChange={setRetour}
          />
        )}
      </ConfirmDialog>
    </section>
  )
}
