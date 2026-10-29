import { useState } from 'react'
import Button from '../../ui/Button.jsx'
import ConfirmDialog from '../../ui/ConfirmDialog.jsx'
import DataTable from '../../ui/DataTable.jsx'
import DetailsModal from '../../ui/DetailsModal.jsx'
import RowActions from '../../ui/RowActions.jsx'
import Badge from '../../ui/Badge.jsx'
import { Select, TextArea } from '../../ui/FormControls.jsx'
import { refreshCounters } from '../../../hooks/useCounters.js'
import { describeError, ficheService } from '../../../services/ficheService.js'
import { DECISIONS, SECTIONS, STATUTS_GAIN } from '../../../utils/constants.js'
import { formatDate, formatDateTime, formatFcfa, formatNumber, plural } from '../../../utils/format.js'
import { detailItems } from '../../../utils/details.js'
import { avecSuivi } from '../../../utils/toast.js'
import './FicheTab.css'

const COLONNES_GAINS = [
  { key: 'categorie_libelle', label: 'Catégorie', width: '22%' },
  { key: 'hypothese_calcul', label: 'Hypothèse de calcul' },
  { key: 'montant_annuel', label: 'Montant annuel', width: '150px', render: (gain) => <b>{formatFcfa(gain.montant_annuel)}</b> },
  { key: 'statut', label: 'Statut', width: '110px', value: (gain) => STATUTS_GAIN[gain.statut] },
]

const tones = { EN_ATTENTE: 'warning', VALIDE: 'success', REFUSE: 'error', ANNULE: 'neutral' }
const CLASSES = { EN_ATTENTE: 'is-todo', VALIDE: 'is-ok', REFUSE: 'is-ko' }

// Les trois portes du parcours, dans l'ordre où la fiche les franchit.
const PORTES = [
  { numero: 0, titre: 'Pertinence', qui: 'Chef de département' },
  { numero: 1, titre: 'Plan d’actions', qui: 'Directeurs concernés' },
  { numero: 2, titre: 'Clôture', qui: 'Contrôle de gestion, puis sponsor' },
]

// État d'une porte d'après ses demandes de la boucle la plus récente.
function etatPorte(validations, porte) {
  const demandes = validations.filter((validation) => validation.porte === porte && validation.decision !== 'ANNULE')
  const boucle = Math.max(...demandes.map((validation) => validation.version_fiche))
  const actuelles = demandes.filter((validation) => validation.version_fiche === boucle)
  if (actuelles.length === 0) return { classe: 'is-later', label: 'À venir' }
  if (actuelles.some((validation) => validation.decision === 'EN_ATTENTE')) return { classe: 'is-todo', label: 'En attente' }
  const derniere = [...actuelles].sort((a, b) => String(b.decidee_le).localeCompare(String(a.decidee_le)))[0]
  if (derniere.decision === 'REFUSE') return { classe: 'is-ko', label: 'Renvoyée au pilote' }
  return { classe: 'is-ok', label: 'Franchie' }
}

const initiales = (nom) => (nom ?? '?').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
// Libellés des boutons et de la boîte de dialogue selon la décision choisie.
const CHOIX = {
  VALIDE: { bouton: 'Approuver', titre: 'Approuver la demande', confirmer: 'Approuver', variant: 'primary', toast: 'Demande approuvée' },
  REFUSE: { bouton: 'Refuser', titre: 'Refuser la demande', confirmer: 'Confirmer le refus', variant: 'danger-solid', toast: 'Refus enregistré — le pilote est notifié' },
  REFAIRE: { bouton: 'À refaire', titre: 'Renvoyer la fiche à refaire', confirmer: 'Renvoyer au pilote', variant: 'danger-solid', toast: 'Fiche renvoyée au pilote' },
  RENVOYER: { bouton: 'Renvoyer', titre: 'Renvoyer la fiche au pilote', confirmer: 'Renvoyer au pilote', variant: 'danger-solid', toast: 'Fiche renvoyée au pilote' },
  CLASSER: { bouton: 'Classer sans suite', titre: 'Classer la fiche sans suite', confirmer: 'Classer sans suite', variant: 'danger-solid', toast: 'Fiche classée sans suite' },
}

// Porte 0 : le chef valide, renvoie à refaire ou classe ; porte 2 : le sponsor valide ou renvoie.
const choixDe = (porte) => (porte === 0 ? ['VALIDE', 'REFAIRE', 'CLASSER'] : porte === 2 ? ['VALIDE', 'RENVOYER'] : ['VALIDE', 'REFUSE'])

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
          <div><dt>Déclarant</dt><dd>{fiche.declarant?.nom ?? '—'}</dd></div>
          <div><dt>Pilote</dt><dd>{fiche.pilote?.nom ?? '—'}</dd></div>
          <div><dt>Sponsor</dt><dd>{fiche.identification.sponsor?.nom ?? '—'}</dd></div>
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
          <div><dt>Gains</dt><dd>{fiche.gains.sans_gain_chiffre ? 'Sans gain chiffré' : `${formatFcfa(fiche.gains.total_a)} par an, dont ${formatFcfa(fiche.gains.total_a_valide)} validés`}</dd></div>
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
  const [gainVu, setGainVu] = useState(null)

  async function run(task, message, enCours = 'Enregistrement en cours…') {
    setBusy(true)
    try {
      onChange(await avecSuivi(enCours, task, { succes: message, echec: 'Rien n’a été enregistré.' }))
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

  const refus = dialog && dialog.decision !== 'VALIDE'
  const decide = (validation, choix) => run(() => ficheService.decision(validation.id, {
    decision: choix === 'VALIDE' ? 'VALIDE' : 'REFUSE',
    commentaire: commentaire || null,
    retour: validation.porte === 2 ? retour : null,
    section: choix !== 'VALIDE' && choix !== 'CLASSER' && section ? Number(section) : null,
    classer: choix === 'CLASSER',
  }), CHOIX[choix].toast, 'Enregistrement de votre décision en cours…')

  return (
    <section className="fiche-tab" data-fiche-tab="validations">
      <h2>Validations</h2>
      <p className="fiche-tab__help">La fiche franchit trois portes. À chacune, les valideurs approuvent ou renvoient la fiche au pilote avec un commentaire.</p>
      <ol className="portes" aria-label="Les trois portes de validation">
        {PORTES.map((porte) => {
          const { classe, label } = etatPorte(fiche.validations, porte.numero)
          return (
            <li className={`portes__porte ${classe}`} key={porte.numero}>
              <span className="portes__numero">{porte.numero}</span>
              <span className="portes__texte">
                <b>{porte.titre}</b>
                <span>{porte.qui}</span>
              </span>
              <span className="portes__etat">{label}</span>
            </li>
          )
        })}
      </ol>

      {PORTES.map((porte) => {
        const demandes = fiche.validations.filter((validation) => validation.porte === porte.numero)
        if (demandes.length === 0) return null
        return (
          <div className="decisions" key={porte.numero}>
            <h3>Porte {porte.numero} · {porte.titre}</h3>
            {demandes.map((validation) => (
              <article className={`decision ${CLASSES[validation.decision] ?? 'is-later'}${validation.actionnable ? ' decision--a-vous' : ''}`} key={validation.id}>
                <span aria-hidden="true" className="sar-avatar">{initiales(validation.valideur?.nom)}</span>
                <div className="decision__corps">
                  <div className="decision__entete">
                    <span>
                      <b>{validation.valideur?.nom ?? 'À désigner'}</b>
                      <span className="fiche-tab__muted"> · {validation.role?.libelle}</span>
                    </span>
                    <Badge tone={tones[validation.decision]}>{DECISIONS[validation.decision]}</Badge>
                  </div>
                  <span className="fiche-tab__muted">
                    Demandé le {formatDate(validation.demandee_le)}
                    {validation.decidee_le && ` · décidé le ${formatDate(validation.decidee_le)}`}
                    {validation.decision === 'EN_ATTENTE' && ` · en attente depuis ${plural(validation.anciennete_jours, 'jour')}`}
                    {fiche.version > 1 && ` · boucle ${validation.version_fiche}`}
                    {validation.decision === 'EN_ATTENTE' && validation.partages?.length > 0 && ` · partagée avec ${validation.partages.map((person) => person.nom).join(', ')}`}
                  </span>
                  {validation.commentaire && <blockquote className="decision__commentaire">{validation.commentaire}</blockquote>}
                  {validation.section_concernee && <span className="fiche-tab__muted">Section à reprendre : {validation.section_concernee}. {SECTIONS[validation.section_concernee - 1]}</span>}
                  {validation.decision === 'EN_ATTENTE' && validation.derniere_relance && (
                    <span className="fiche-tab__muted">Relancé le {formatDateTime(validation.derniere_relance)}</span>
                  )}
                  {validation.actionnable && (
                    <div className="decision__choix">
                      <span>Votre décision est attendue :</span>
                      {choixDe(validation.porte).map((choix) => (
                        <Button disabled={busy} key={choix} size="small" type="button" variant={choix === 'VALIDE' ? 'success' : 'danger'} onClick={() => setDialog({ validation, decision: choix })}>{CHOIX[choix].bouton}</Button>
                      ))}
                    </div>
                  )}
                  {validation.relancable && (
                    <div className="decision__choix">
                      <Button disabled={busy} icon="bell" size="small" type="button" variant="secondary" onClick={() => run(() => ficheService.relancer('validation', validation.id), 'Relance envoyée au valideur', 'Envoi de la relance en cours…')}>Relancer</Button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )
      })}

      {fiche.droits.peut_decider_gains && (
        <div>
          <h3>Gains à valider</h3>
          <DataTable
            actions={(gain) => (
              <RowActions
                actions={[
                  { label: 'Voir', onClick: () => setGainVu(gain) },
                  { icon: 'check', label: 'Valider', variant: 'success', disabled: busy || gain.statut === 'VALIDE', onClick: () => run(() => ficheService.decisionGain(gain.id, 'VALIDE'), 'Gain validé') },
                  { icon: 'x', label: 'Refuser', variant: 'danger', disabled: busy || gain.statut === 'REFUSE', onClick: () => run(() => ficheService.decisionGain(gain.id, 'REFUSE'), 'Gain refusé') },
                ]}
                maxVisible={3}
              />
            )}
            actionsWidth="300px"
            columns={COLONNES_GAINS}
            rows={fiche.gains.lignes}
            variant="compact"
          />
          <DetailsModal
            items={gainVu ? detailItems(COLONNES_GAINS, gainVu) : []}
            open={Boolean(gainVu)}
            title="Détail du gain"
            onClose={() => setGainVu(null)}
          />
        </div>
      )}

      <ConfirmDialog
        busy={busy}
        confirmLabel={dialog ? CHOIX[dialog.decision].confirmer : ''}
        disabled={refus && !commentaire.trim()}
        open={Boolean(dialog)}
        title={dialog ? CHOIX[dialog.decision].titre : ''}
        variant={dialog ? CHOIX[dialog.decision].variant : 'primary'}
        onCancel={() => setDialog(null)}
        onConfirm={() => decide(dialog.validation, dialog.decision)}
      >
        {dialog && <Resume fiche={fiche} validation={dialog.validation} />}
        {refus && dialog.decision !== 'CLASSER' && <p className="fiche-tab__muted">Dites au pilote ce qu’il doit corriger : le commentaire est obligatoire.</p>}
        {dialog?.decision === 'CLASSER' && <p className="fiche-tab__muted">La fiche est close sans suite (doublon, hors sujet, déjà traité). Le motif est obligatoire et le pilote est prévenu.</p>}
        <TextArea label={refus ? 'Motif' : 'Commentaire'} required={refus} value={commentaire} onChange={setCommentaire} />
        {refus && dialog.decision !== 'CLASSER' && (
          <Select
            hint="Le pilote est envoyé directement sur cette section."
            label="Section à corriger"
            options={SECTIONS.slice(0, dialog.validation.porte === 0 ? 4 : 11).map((titre, index) => [String(index + 1), `${index + 1}. ${titre}`])}
            placeholder="Plusieurs ou aucune en particulier"
            value={section}
            onChange={setSection}
          />
        )}
        {dialog?.decision === 'RENVOYER' && (
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
