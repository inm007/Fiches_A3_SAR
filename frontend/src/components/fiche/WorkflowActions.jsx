import { useState } from 'react'
import Button from '../ui/Button.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import { Select, TextArea } from '../ui/FormControls.jsx'
import { describeError, ficheService } from '../../services/ficheService.js'
import { TRANSITIONS } from '../../utils/constants.js'
import { avecSuivi } from '../../utils/toast.js'
import { refreshCounters } from '../../hooks/useCounters.js'
import { peopleOptions } from './sections/options.js'
import EquipeFiche from './EquipeFiche.jsx'
import PartageValidations from './PartageValidations.jsx'
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

  // Chaque action s'annonce pendant qu'elle se fait (« Soumission du plan… »), puis dit si elle a réussi.
  async function run(task, message, enCours = 'Action en cours…') {
    setBusy(true)
    try {
      const updated = await avecSuivi(enCours, task, {
        succes: (suivante) => message ?? `C’est fait : la fiche est à l’étape « ${suivante.statut_etape_libelle} ».`,
        echec: 'L’action n’a pas abouti : voyez le détail sur la fiche.',
      })
      onChange(updated)
      setDialog(null)
      setMotif('')
      refreshCounters()
    } catch (error) {
      setDialog(null)
      onError(describeError(error))
    } finally {
      setBusy(false)
    }
  }

  const transition = (code) => run(() => ficheService.transition(fiche.id, code, fiche.statut_etape, motif || null), undefined, TRANSITIONS[code].enCours)
  const startTransition = (code) => (TRANSITIONS[code].motif ? setDialog({ type: 'transition', code }) : transition(code))

  async function designer() {
    await run(async () => {
      await ficheService.modifierAdmin(fiche.id, { pilote_id: Number(pilote), motif: motif || null })
      return ficheService.get(fiche.id)
    }, fiche.pilote ? 'Pilote changé' : 'Pilote désigné', fiche.pilote ? 'Changement du pilote…' : 'Désignation du pilote…')
  }

  async function meDesigner() {
    await run(() => ficheService.meDesignerPilote(fiche.id), 'Vous êtes désigné pilote', 'Désignation en cours…')
  }

  async function basculerConfidentialite() {
    const cible = fiche.confidentialite === 'RESTREINT' ? 'NORMAL' : 'RESTREINT'
    await run(async () => {
      if (droits.est_pilote) return ficheService.confidentialite(fiche.id, cible, motif || null)
      await ficheService.modifierAdmin(fiche.id, { confidentialite: cible })
      return ficheService.get(fiche.id)
    }, `Confidentialité : ${cible === 'RESTREINT' ? 'Restreint' : 'Normal'}`, 'Changement de la confidentialité…')
  }

  // Un seul bouton principal : l'étape suivante, ou « Nouvelle boucle » quand l'objectif n'est pas atteint.
  const nouvelleBoucle = droits.transitions.includes('T11') && fiche.resultats?.objectif_atteint === 'NON'
  const principale = nouvelleBoucle ? 'T11' : droits.transitions.find((code) => TRANSITIONS[code].primary)
  // Le panneau « Prochaine étape » porte déjà ce bouton, avec ce qu'il reste à faire : pas de doublon en haut.
  const dansLePanneau = !nouvelleBoucle && principale === fiche.prochaine_etape?.code
  const secondaires = droits.transitions.filter((code) => code !== principale)
  // L'équipe se compose à la fin de la section 4 : une fois l'objectif posé, le pilote ajoute un membre depuis l'en-tête.
  const ajoutMembre = droits.peut_gerer_equipe && (fiche.statut_etape !== 'OUVERT' || fiche.completude?.[4] === 'complet')
  const menu = [
    ...secondaires.map((code) => ({ key: code, label: TRANSITIONS[code].label, danger: TRANSITIONS[code].danger || code === 'T12', onClick: () => startTransition(code) })),
    ...(droits.peut_designer_pilote && fiche.pilote ? [
      { key: 'pilote', label: 'Changer le pilote', onClick: () => setDialog({ type: 'pilote' }) },
    ] : []),
    ...(droits.peut_designer_pilote && fiche.validations?.some((validation) => validation.decision === 'EN_ATTENTE')
      ? [{ key: 'partage-validation', label: 'Partager une validation', onClick: () => setDialog({ type: 'partage-validation' }) }] : []),
    ...(droits.peut_changer_confidentialite
      ? [{ key: 'confidentialite', label: fiche.confidentialite === 'RESTREINT' ? 'Passer en Normal' : 'Passer en Restreint', onClick: () => setDialog({ type: 'confidentialite' }) }] : []),
  ]

  return (
    <div aria-label="Actions sur la fiche" className="workflow-actions">
      {droits.peut_designer_pilote && !fiche.pilote && (
        <Button type="button" variant="primary" onClick={() => setDialog({ type: 'pilote' })}>Désigner le pilote</Button>
      )}
      {droits.peut_se_designer_pilote && (
        <Button loading={busy} loadingLabel="Désignation…" type="button" variant="primary" onClick={meDesigner}>Me désigner comme pilote</Button>
      )}
      {principale && !dansLePanneau && (
        <Button loading={busy} loadingLabel="En cours…" type="button" variant="primary" onClick={() => startTransition(principale)}>
          {TRANSITIONS[principale].label}
        </Button>
      )}
      {ajoutMembre && (
        <Button icon="users" type="button" variant="secondary" onClick={() => setDialog({ type: 'equipe' })}>Ajouter un membre</Button>
      )}
      {menu.length > 0 && (
        <details className="workflow-actions__menu">
          <summary className="sar-button sar-button--secondary">Plus d’actions</summary>
          <div className="workflow-actions__items" role="menu">
            {menu.map((item) => (
              <button
                className={item.danger ? 'is-danger' : undefined}
                disabled={busy}
                key={item.key}
                role="menuitem"
                type="button"
                onClick={(event) => { event.currentTarget.closest('details').open = false; item.onClick() }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </details>
      )}

      <ConfirmDialog
        busy={busy}
        confirmLabel={dialog?.code ? TRANSITIONS[dialog.code].label : 'Confirmer'}
        disabled={!motif.trim()}
        open={dialog?.type === 'transition'}
        title={dialog?.code ? TRANSITIONS[dialog.code].label : ''}
        variant={dialog?.code === 'T12' || dialog?.code === 'T14' ? 'danger-solid' : 'primary'}
        onCancel={() => setDialog(null)}
        onConfirm={() => transition(dialog.code)}
      >
        {dialog?.code === 'T11' && <p>La fiche repart à l’analyse (boucle {fiche.version + 1}) : les mesures Après et de maintien sont effacées, la copie figée garde la boucle actuelle.</p>}
        {dialog?.code === 'T14' && <p>La fiche est fermée sans traitement et sort des fiches en cours. Ce choix est inscrit dans l’historique.</p>}
        <TextArea label={dialog?.code ? TRANSITIONS[dialog.code].motif : ''} required value={motif} onChange={setMotif} />
      </ConfirmDialog>

      <ConfirmDialog
        busy={busy}
        confirmLabel={fiche.pilote ? 'Changer le pilote' : 'Désigner le pilote'}
        disabled={!pilote || (fiche.statut_etape !== 'OUVERT' && !motif.trim())}
        open={dialog?.type === 'pilote'}
        title={fiche.pilote ? 'Changer le pilote' : 'Désigner le pilote'}
        variant="primary"
        onCancel={() => setDialog(null)}
        onConfirm={designer}
      >
        <Select
          hint="Titulaires du rôle Pilote dans l’unité de la fiche."
          label="Pilote"
          options={peopleOptions(options?.pilotes?.filter((person) => person.id !== fiche.pilote?.id))}
          required
          value={pilote}
          onChange={setPilote}
        />
        {fiche.statut_etape !== 'OUVERT' && (
          <TextArea hint="Départ définitif, mutation… Inscrit dans l’historique." label="Motif du changement" required value={motif} onChange={setMotif} />
        )}
      </ConfirmDialog>

      <ConfirmDialog
        confirmLabel="Fermer"
        hideCancel
        open={dialog?.type === 'partage-validation'}
        wide
        title="Partager une validation"
        variant="primary"
        onCancel={() => setDialog(null)}
        onConfirm={async () => { setDialog(null); onChange(await ficheService.get(fiche.id)) }}
      >
        <p>Quand un valideur est absent, malade ou parti, partagez sa demande avec un autre titulaire du même rôle. Les deux la voient ; le premier qui décide la traite.</p>
        <PartageValidations ficheId={fiche.id} />
      </ConfirmDialog>

      <ConfirmDialog
        confirmLabel="Fermer"
        hideCancel
        open={dialog?.type === 'equipe'}
        wide
        title="Ajouter un membre"
        variant="primary"
        onCancel={() => setDialog(null)}
        onConfirm={() => setDialog(null)}
      >
        <EquipeFiche fiche={fiche} options={options} onChange={onChange} />
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
