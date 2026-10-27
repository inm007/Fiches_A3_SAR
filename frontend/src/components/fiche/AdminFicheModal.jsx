import { useMemo, useState } from 'react'
import { apiRequest } from '../../auth/api.js'
import Alert from '../ui/Alert.jsx'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import { Select } from '../ui/FormControls.jsx'
import Icon from '../ui/Icon.jsx'
import Modal from '../ui/Modal.jsx'
import { TextArea } from '../ui/FormControls.jsx'
import EtapeBadge from './EtapeBadge.jsx'
import PartageValidations from './PartageValidations.jsx'
import './AdminFicheModal.css'

function assignmentIsCurrent(assignment) {
  const today = new Date().toISOString().slice(0, 10)
  return assignment.actif
    && (!assignment.date_debut || String(assignment.date_debut).slice(0, 10) <= today)
    && (!assignment.date_fin || String(assignment.date_fin).slice(0, 10) >= today)
}

/**
 * Administrateur fonctionnel : pilote (à toute étape avant la clôture, avec motif après
 * l'étape Ouvert), confidentialité et partage des validations en attente. L'équipe, composée
 * par le pilote, est affichée en lecture seule.
 * Le serveur (FicheAdminController) reste seul juge des droits et des valeurs autorisées.
 */

function AdminFicheModal({ fiche, users, onClose, onSaved }) {
  const [piloteId, setPiloteId] = useState(fiche?.pilote ? String(fiche.pilote.id) : '')
  const [confidentialite, setConfidentialite] = useState(fiche?.confidentialite ?? 'NORMAL')
  const [motif, setMotif] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const eligiblePilots = useMemo(() => {
    if (!fiche) return []
    return users.filter((user) => user.actif && user.affectations.some((assignment) => (
      assignment.role?.code === 'PILOTE'
      && assignment.unite_id === fiche.unite?.id
      && assignmentIsCurrent(assignment)
    )))
  }, [fiche, users])
  const piloteModifiable = !['CLOTURE', 'CLASSE'].includes(fiche?.statut_etape)
  const piloteChange = Boolean(fiche && piloteModifiable && piloteId !== (fiche.pilote ? String(fiche.pilote.id) : ''))
  const motifRequis = piloteChange && fiche?.statut_etape !== 'OUVERT'
  const hasChanges = Boolean(fiche && (confidentialite !== fiche.confidentialite || piloteChange))

  async function save(event) {
    event.preventDefault()
    if (!fiche || !hasChanges) return
    setSaving(true)
    setError('')
    const changes = { confidentialite }
    if (piloteChange) {
      changes.pilote_id = piloteId ? Number(piloteId) : null
      changes.motif = motif.trim() || null
    }
    try {
      const result = await apiRequest(`/admin/fiches/${fiche.id}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      })
      onSaved(result.data)
    } catch (saveError) {
      const validationErrors = saveError.data?.errors
      setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : saveError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      dirty={hasChanges}
      footer={({ requestClose }) => (
        <>
          <Button disabled={saving} onClick={requestClose} type="button" variant="secondary">Annuler</Button>
          <Button disabled={!hasChanges || (motifRequis && !motif.trim())} form="admin-fiche-form" loading={saving} loadingLabel="Enregistrement…" type="submit">Enregistrer</Button>
        </>
      )}
      onClose={onClose}
      open={fiche !== null}
      size="md"
      title={fiche ? `Gérer la fiche ${fiche.numero_a3}` : 'Gérer la fiche'}
    >
      {fiche && (
        <form className="admin-fiche-form" id="admin-fiche-form" onSubmit={save}>
          {error && <Alert severity="error">{error}</Alert>}
          <div className="admin-fiche-form__summary">
            <strong title={fiche.titre}>{fiche.titre}</strong>
            <div className="admin-fiche-form__badges">
              <Badge>{fiche.unite?.libelle ?? 'Unité inconnue'}</Badge>
              <EtapeBadge etape={fiche.statut_etape} />
            </div>
          </div>
          <Select
            data-modal-autofocus
            label="Confidentialité"
            options={[['NORMAL', 'Normal'], ['RESTREINT', 'Restreint']]}
            placeholder={null}
            value={confidentialite}
            wide
            onChange={setConfidentialite}
          />
          {piloteModifiable ? (
            <>
              <Select
                hint={eligiblePilots.length === 0 ? 'Aucun pilote actif n’est affecté à cette unité.' : undefined}
                label="Pilote"
                options={eligiblePilots.map((user) => [String(user.id), `${user.prenom} ${user.nom} — ${user.identifiant}`])}
                placeholder={fiche.statut_etape === 'OUVERT' ? 'Non désigné' : 'Choisir…'}
                value={piloteId}
                wide
                onChange={setPiloteId}
              />
              {motifRequis && (
                <TextArea
                  hint="Départ définitif, mutation… Le motif est inscrit dans l’historique. Pour une absence, le pilote peut ajouter un renfort à son équipe."
                  label="Motif du changement de pilote"
                  required
                  value={motif}
                  onChange={setMotif}
                />
              )}
            </>
          ) : (
            <p className="admin-fiche-form__note">Le pilote d’une fiche clôturée ou classée ne change plus.</p>
          )}
          <div className="admin-fiche-form__equipe">
            <span className="admin-fiche-form__label">Équipe</span>
            {(fiche.membres ?? []).length === 0
              ? <span className="sar-muted">Aucun membre : le pilote compose l’équipe à la fin de la section 4.</span>
              : <span>{fiche.membres.map((user) => `${user.prenom} ${user.nom}`).join(', ')}</span>}
          </div>
          {['EN_VALIDATION_PLAN', 'EN_VALIDATION_CLOTURE', 'EN_ATTENTE'].includes(fiche.statut_etape) && <PartageValidations ficheId={fiche.id} />}
          <p className="admin-fiche-form__note">
            <Icon name="info" size={16} />
            <span>Les autres données de la fiche restent en lecture seule.</span>
          </p>
        </form>
      )}
    </Modal>
  )
}

export default AdminFicheModal
