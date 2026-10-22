import { useState } from 'react'
import Alert from '../../ui/Alert.jsx'
import Button from '../../ui/Button.jsx'
import ConfirmDialog from '../../ui/ConfirmDialog.jsx'
import Badge from '../../ui/Badge.jsx'
import { Select, TextArea } from '../../ui/FormControls.jsx'
import { refreshCounters } from '../../../hooks/useCounters.js'
import { describeError, ficheService } from '../../../services/ficheService.js'
import { DECISIONS, SECTIONS, STATUTS_GAIN } from '../../../utils/constants.js'
import { formatDate, formatDateTime, formatFcfa, formatNumber, plural } from '../../../utils/format.js'
import { toast } from '../../../utils/toast.js'
import './FicheTab.css'

const tones = { EN_ATTENTE: 'warning', VALIDE: 'success', REFUSE: 'error', ANNULE: 'neutral' }
const steps = { EN_ATTENTE: 'is-wait', VALIDE: 'is-ok', REFUSE: 'is-ko' }
const RETOURS = [
  ['VERIFICATION_MAINTIEN', 'Le maintien, les gains, la pérennisation ou les leçons sont à reprendre'],
  ['MESURE_RESULTATS', 'La mesure des résultats est à refaire'],
]

// Résumé montré au valideur avant sa décision : ce qu'il engage, sans parcourir toute la fiche.
function Resume({ fiche, validation }) {
  const principal = fiche.indicateurs.find((indicateur) => indicateur.principal)
  const actions = fiche.actions.filter((action) => !action.action_origine_id && action.statut !== 'ANNULE')
  const moc = fiche.risques.filter((risque) => risque.moc_requis)
  return (
    <dl className="fiche-tab__resume">
      <div><dt>Problème</dt><dd>{fiche.contexte.enonce_probleme}</dd></div>
      {principal && (
        <div>
          <dt>KPI principal</dt>
          <dd>
            {principal.libelle} : {formatNumber(principal.actuelle)} → cible {formatNumber(principal.cible)} {principal.unite_mesure}
            {validation.porte === 2 && principal.apres !== null && ` · après action ${formatNumber(principal.apres)}`}
          </dd>
        </div>
      )}
      <div><dt>Objectif</dt><dd>{fiche.objectif.objectif_smart ?? '—'}</dd></div>
      {validation.porte === 0 && (
        <>
          <div><dt>Contexte</dt><dd>{fiche.contexte.contexte ?? '—'}</dd></div>
          <div><dt>Initiateur</dt><dd>{fiche.declarant?.nom ?? '—'}{fiche.departement && ` · ${fiche.departement.libelle}`}</dd></div>
        </>
      )}
      {validation.porte === 0 ? null : validation.porte === 1 ? (
        <>
          <div><dt>Plan</dt><dd>{plural(actions.length, 'action')} · coût estimé {formatFcfa(actions.reduce((somme, action) => somme + (action.cout_estime ?? 0), 0))}</dd></div>
          <div><dt>Risques</dt><dd>{fiche.risques.length ? `${plural(fiche.risques.length, 'risque')}, dont ${plural(moc.length, 'MOC')}` : 'Aucun risque déclaré'}</dd></div>
        </>
      ) : (
        <>
          <div><dt>Objectif atteint</dt><dd>{{ OUI: 'Oui', PARTIELLEMENT: 'Partiellement', NON: 'Non' }[fiche.resultats.objectif_atteint] ?? '—'}</dd></div>
          <div><dt>Maintien</dt><dd>{(fiche.maintien ?? []).map((jalon) => `${jalon.jalon.replace('J', 'J+')} : ${jalon.valeur === null ? '—' : formatNumber(jalon.valeur)}`).join(' · ')}</dd></div>
          <div><dt>Gains</dt><dd>{fiche.gains.sans_gain_chiffre ? 'Sans gain chiffré' : `${formatFcfa(fiche.gains.total_a)} par an · gain net ${formatFcfa(fiche.gains.gain_net)}`}</dd></div>
        </>
      )}
    </dl>
  )
}

export default function ValidationsTab({ fiche, onChange, onError }) {
  const [dialog, setDialog] = useState(null)
  const [commentaire, setCommentaire] = useState('')
  const [retour, setRetour] = useState('VERIFICATION_MAINTIEN')
  const [section, setSection] = useState('')
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
      setSection('')
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
    section: decision === 'REFUSE' && section ? Number(section) : null,
  }), decision === 'VALIDE' ? 'Demande approuvée' : 'Refus enregistré — le pilote est notifié')

  return (
    <section className="fiche-tab" data-fiche-tab="validations">
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
            {validation.section_concernee && <span className="fiche-tab__muted">Section en cause : {validation.section_concernee}. {SECTIONS[validation.section_concernee - 1]}</span>}
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
        {dialog && <Resume fiche={fiche} validation={dialog.validation} />}
        {dialog?.decision === 'REFUSE' && <p className="fiche-tab__muted">Dites au pilote ce qu’il doit corriger : le commentaire est obligatoire.</p>}
        <TextArea label={dialog?.decision === 'REFUSE' ? 'Motif du refus' : 'Commentaire'} required={dialog?.decision === 'REFUSE'} value={commentaire} onChange={setCommentaire} />
        {dialog?.decision === 'REFUSE' && (
          <Select
            hint="Le pilote est envoyé directement sur cette section."
            label="Section à corriger"
            options={SECTIONS.slice(0, 11).map((titre, index) => [String(index + 1), `${index + 1}. ${titre}`])}
            placeholder="Plusieurs ou aucune en particulier"
            value={section}
            onChange={setSection}
          />
        )}
        {dialog?.decision === 'REFUSE' && dialog.validation.porte === 2 && (
          <Select
            label="Qu’est-ce qui est en cause ?"
            options={RETOURS}
            required
            value={retour}
            onChange={setRetour}
          />
        )}
      </ConfirmDialog>
    </section>
  )
}
