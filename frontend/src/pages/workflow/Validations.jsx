import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Alert from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import { TextArea } from '../../components/common/FormControls.jsx'
import Skeleton from '../../components/common/Skeleton.jsx'
import { refreshCounters } from '../../hooks/useCounters.js'
import { describeError, ficheService } from '../../services/ficheService.js'
import { toast } from '../../utils/toast.js'
import './Validations.css'

const SEUIL_ANCIENNETE = 7

/**
 * Demandes qui attendent le profil actif, les plus anciennes en premier (UX §9.1).
 * Le serveur reste juge : B7, B8 et les gains à valider renvoient un message clair.
 */
function Validations() {
  const navigate = useNavigate()
  const [demandes, setDemandes] = useState(null)
  const [error, setError] = useState(null)
  const [refus, setRefus] = useState(null)
  const [commentaire, setCommentaire] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => ficheService.validations()
    .then(setDemandes)
    .catch((loadError) => setError(describeError(loadError))), [])

  useEffect(() => { load() }, [load])

  async function decide(demande, decision) {
    setBusy(true)
    setError(null)
    try {
      await ficheService.decision(demande.id, { decision, commentaire: commentaire || null, retour: demande.porte === 2 ? 'VERIFICATION_MAINTIEN' : null })
      toast(decision === 'VALIDE' ? `${demande.fiche.numero_a3} — demande approuvée` : `${demande.fiche.numero_a3} — refus enregistré, le pilote est notifié`)
      setRefus(null)
      setCommentaire('')
      refreshCounters()
      load()
    } catch (decisionError) {
      setRefus(null)
      setError(describeError(decisionError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="validations-page">
      <header className="sar-page-head"><h1>Validations à traiter</h1></header>
      {error && (
        <Alert severity="error">
          {error.message}
          {error.manques.length > 0 && <ul>{error.manques.map((manque) => <li key={manque}>{manque}</li>)}</ul>}
        </Alert>
      )}
      {!demandes && !error && <Skeleton />}
      {demandes?.length === 0 && <EmptyState description="Les demandes qui vous sont adressées sur ce profil apparaîtront ici." title="Aucune demande en attente" />}
      {demandes?.length > 0 && (
        <div className="sar-card validations-page__card">
          <table className="sar-table">
            <thead><tr><th>N° A3</th><th>Titre</th><th>Porte</th><th>Rôle demandé</th><th>Ancienneté</th><th /></tr></thead>
            <tbody>
              {demandes.map((demande) => (
                <tr key={demande.id}>
                  <td><b>{demande.fiche.numero_a3}</b></td>
                  <td>{demande.fiche.titre}</td>
                  <td>Porte {demande.porte}</td>
                  <td>{demande.role}</td>
                  <td className={demande.anciennete_jours >= SEUIL_ANCIENNETE ? 'validations-page__old' : 'validations-page__age'}>{demande.anciennete_jours} j</td>
                  <td className="validations-page__actions">
                    <Button size="small" type="button" variant="secondary" onClick={() => navigate(`/fiches/${demande.fiche.id}`)}>Ouvrir</Button>
                    <Button disabled={busy} size="small" type="button" variant="success" onClick={() => decide(demande, 'VALIDE')}>Approuver</Button>
                    <Button disabled={busy} size="small" type="button" variant="danger" onClick={() => setRefus(demande)}>Refuser</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        busy={busy}
        confirmLabel="Confirmer le refus"
        disabled={!commentaire.trim()}
        open={Boolean(refus)}
        title="Refuser la demande"
        onCancel={() => setRefus(null)}
        onConfirm={() => decide(refus, 'REFUSE')}
      >
        <p className="sar-muted">Un commentaire est obligatoire (règle B6). {refus?.porte === 2 && 'La fiche revient à la vérification du maintien.'}</p>
        <TextArea label="Motif du refus" required rows={4} value={commentaire} onChange={setCommentaire} />
      </ConfirmDialog>
    </section>
  )
}

export default Validations
