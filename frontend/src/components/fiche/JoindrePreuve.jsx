import { useState } from 'react'
import { errorMessage, ficheService } from '../../services/ficheService.js'
import { toast } from '../../utils/toast.js'
import Button from '../ui/Button.jsx'
import FileInput from '../ui/FileInput.jsx'

export const FICHIERS_ACCEPTES = '.pdf,.png,.jpg,.jpeg,.docx,.xlsx,.pptx'

/**
 * Joindre un document ou une photo comme preuve d'une ligne déjà enregistrée (action de
 * pérennisation). Le fichier rejoint les pièces jointes de la fiche ; `onJoint` reçoit la
 * fiche rechargée, pour que la preuve soit aussitôt comptée.
 */
function JoindrePreuve({ fiche, perennisationId, onJoint }) {
  const [fichier, setFichier] = useState(null)
  const [busy, setBusy] = useState(false)
  const [erreur, setErreur] = useState('')
  const [cle, setCle] = useState(0)

  async function joindre() {
    setBusy(true)
    setErreur('')
    try {
      await ficheService.ajouterPieceJointe(fiche.id, fichier, { perennisationId })
      setFichier(null)
      setCle((valeur) => valeur + 1)
      toast('Preuve jointe : elle figure dans les pièces jointes de la fiche.')
      onJoint?.(await ficheService.get(fiche.id))
    } catch (error) {
      setErreur(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="joindre-preuve">
      <FileInput accept={FICHIERS_ACCEPTES} file={fichier} key={cle} label="Ou joindre un document ou une photo" onChange={setFichier} />
      <Button disabled={!fichier} loading={busy} loadingLabel="Envoi…" size="small" type="button" variant="secondary" onClick={joindre}>Joindre</Button>
      {erreur && <span className="fiche-section__ko" role="alert">{erreur}</span>}
    </div>
  )
}

export default JoindrePreuve
