import { useMemo, useState } from 'react'
import { apiRequest } from '../../auth/api.js'
import Alert from '../ui/Alert.jsx'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import { Select } from '../ui/FormControls.jsx'
import Icon from '../ui/Icon.jsx'
import Modal from '../ui/Modal.jsx'
import EtapeBadge from './EtapeBadge.jsx'
import './AdminFicheModal.css'

function assignmentIsCurrent(assignment) {
  const today = new Date().toISOString().slice(0, 10)
  return assignment.actif
    && (!assignment.date_debut || String(assignment.date_debut).slice(0, 10) <= today)
    && (!assignment.date_fin || String(assignment.date_fin).slice(0, 10) >= today)
}

/**
 * Administrateur fonctionnel : désignation du pilote (étape Ouvert) et confidentialité.
 * Le serveur (FicheAdminController) reste seul juge des droits et des valeurs autorisées.
 */
function AdminFicheModal({ fiche, users, onClose, onSaved }) {
  const [piloteId, setPiloteId] = useState(fiche?.pilote ? String(fiche.pilote.id) : '')
  const [confidentialite, setConfidentialite] = useState(fiche?.confidentialite ?? 'NORMAL')
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
  const hasChanges = Boolean(fiche && (
    confidentialite !== fiche.confidentialite
    || (fiche.statut_etape === 'OUVERT' && piloteId !== (fiche.pilote ? String(fiche.pilote.id) : ''))
  ))

  async function save(event) {
    event.preventDefault()
    if (!fiche || !hasChanges) return
    setSaving(true)
    setError('')
    const changes = { confidentialite }
    if (fiche.statut_etape === 'OUVERT') {
      changes.pilote_id = piloteId ? Number(piloteId) : null
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
          <Button disabled={!hasChanges} form="admin-fiche-form" loading={saving} loadingLabel="Enregistrement…" type="submit">Enregistrer</Button>
        </>
      )}
      onClose={onClose}
      open={fiche !== null}
      size="sm"
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
          {fiche.statut_etape === 'OUVERT' ? (
            <Select
              hint={eligiblePilots.length === 0 ? 'Aucun pilote actif n’est affecté à cette unité.' : undefined}
              label="Pilote"
              options={eligiblePilots.map((user) => [String(user.id), `${user.prenom} ${user.nom} — ${user.identifiant}`])}
              placeholder="Non désigné"
              value={piloteId}
              wide
              onChange={setPiloteId}
            />
          ) : (
            <p className="admin-fiche-form__note">Le pilote ne peut être changé qu’à l’étape Ouvert.</p>
          )}
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
