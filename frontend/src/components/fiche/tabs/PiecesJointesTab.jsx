import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../../auth/useAuth.js'
import Button from '../../ui/Button.jsx'
import EmptyState from '../../ui/EmptyState.jsx'
import FileInput from '../../ui/FileInput.jsx'
import { Select } from '../../ui/FormControls.jsx'
import Skeleton from '../../ui/Skeleton.jsx'
import { describeError, errorMessage, ficheService } from '../../../services/ficheService.js'
import { formatDate } from '../../../utils/format.js'
import { FICHIERS_ACCEPTES, PiecesJointesContext, telechargerPiece } from '../preuves.js'
import { toast } from '../../../utils/toast.js'
import './FicheTab.css'
import './PiecesJointesTab.css'

function formatSize(bytes) {
  return bytes < 1024 * 1024
    ? `${Math.ceil(bytes / 1024)} Ko`
    : `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export default function PiecesJointesTab({ fiche, onError }) {
  const { user } = useAuth()
  const { recharger: rechargerPreuves } = useContext(PiecesJointesContext)
  const [attachments, setAttachments] = useState([])
  const [limits, setLimits] = useState({ attachment_max_size_mb: 10, attachment_max_files: 20 })
  const [cible, setCible] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const formRef = useRef(null)

  // Hors pilote et équipe, on ne joint un fichier qu'à l'une de ses propres actions.
  const responsableSeul = !fiche.droits.est_pilote && !fiche.droits.est_membre
  const cibles = useMemo(() => [
    ...fiche.actions
      .filter((action) => !responsableSeul || action.responsable_id === user?.id)
      .map((action) => [`action:${action.id}`, `Action : ${action.description}`]),
    ...(responsableSeul ? [] : (fiche.perennisation ?? []).map((ligne) => [`perennisation:${ligne.id}`, `Pérennisation : ${ligne.type_libelle}`])),
  ], [fiche.actions, fiche.perennisation, responsableSeul, user?.id])

  async function reload() {
    const result = await ficheService.piecesJointes(fiche.id)
    setAttachments(result.data)
    setLimits(result.meta)
    rechargerPreuves()
  }

  useEffect(() => {
    let cancelled = false
    ficheService.piecesJointes(fiche.id)
      .then((result) => {
        if (!cancelled) {
          setAttachments(result.data)
          setLimits(result.meta)
        }
      })
      .catch((error) => {
        if (!cancelled) setMessage(describeError(error).message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [fiche.id])

  async function upload(event) {
    event.preventDefault()
    setMessage('')
    setBusy(true)
    try {
      const [type, id] = cible.split(':')
      await ficheService.ajouterPieceJointe(fiche.id, file, { objet: type, objetId: id })
      await reload()
      setFile(null)
      setCible('')
      formRef.current?.reset()
      toast('Pièce jointe ajoutée.')
    } catch (error) {
      setMessage(errorMessage(error))
      onError?.(describeError(error))
    } finally {
      setBusy(false)
    }
  }

  async function download(attachment) {
    setMessage('')
    try {
      await telechargerPiece(attachment)
    } catch (error) {
      setMessage(describeError(error).message)
    }
  }

  return (
    <section className="fiche-tab">
      <h2>Pièces jointes</h2>
      <p className="fiche-tab__help">
        Formats acceptés : PDF, PNG, JPEG, DOCX, XLSX et PPTX. Limites actuelles : {limits.attachment_max_size_mb} Mo par fichier et {limits.attachment_max_files} fichiers par fiche.
      </p>
      {message && <p className="pieces-jointes__message" role="alert">{message}</p>}

      {fiche.droits.peut_ajouter_piece_jointe && (
        <form className="pieces-jointes__upload" ref={formRef} onSubmit={upload}>
          <FileInput accept={FICHIERS_ACCEPTES} file={file} label="Fichier" required onChange={setFile} />
          <Select
            label={responsableSeul ? 'Action dont vous êtes responsable' : 'Associer à une action ou à la pérennisation (facultatif)'}
            options={cibles}
            placeholder={responsableSeul ? 'Choisir une action' : 'Fichier associé à la fiche'}
            required={responsableSeul}
            value={cible}
            onChange={setCible}
          />
          <Button disabled={!file || (responsableSeul && !cible)} icon="plus" loading={busy} loadingLabel="Envoi en cours…" type="submit">
            Ajouter le fichier
          </Button>
        </form>
      )}

      {loading ? <Skeleton lines={3} height={22} /> : (
        <div className="pieces-jointes__list">
          {attachments.length === 0 && <EmptyState icon="file" title="Aucune pièce jointe pour cette fiche" />}
          {attachments.map((attachment) => (
            <article className="pieces-jointes__item" key={attachment.id}>
              <div>
                <strong>{attachment.nom}</strong>
                <p className="fiche-tab__muted">
                  {formatSize(attachment.taille)} · {attachment.auteur} · {formatDate(attachment.created_at)}
                  {attachment.action && <> · Action : {attachment.action}</>}
                  {attachment.perennisation_id && <> · Pérennisation : {fiche.perennisation?.find((ligne) => ligne.id === attachment.perennisation_id)?.type_libelle ?? 'action supprimée'}</>}
                </p>
              </div>
              <Button icon="download" type="button" variant="secondary" onClick={() => download(attachment)}>
                Télécharger
              </Button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
