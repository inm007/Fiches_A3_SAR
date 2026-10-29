import { useContext, useId, useState } from 'react'
import { errorMessage, ficheService } from '../../services/ficheService.js'
import { avecSuivi } from '../../utils/toast.js'
import Icon from '../ui/Icon.jsx'
import Spinner from '../ui/Spinner.jsx'
import { FICHIERS_ACCEPTES, PiecesJointesContext, telechargerPiece } from './preuves.js'
import './PreuveJointe.css'

/**
 * Preuve en pièce jointe d'une ligne enregistrée (cause, MOC, pérennisation, contrôle…) :
 * les fichiers déjà joints, et un bouton qui ouvre directement le choix d'un document ou d'une
 * photo. L'envoi part aussitôt et s'annonce (« Envoi en cours… »), puis le fichier apparaît.
 *
 * @param {{ objet: string, objetId?: number, fiche: object, readOnly?: boolean, compact?: boolean, onJoint?: Function }} props
 */
function PreuveJointe({ objet, objetId, fiche, readOnly, compact, onJoint }) {
  const id = useId()
  const { pieces, recharger } = useContext(PiecesJointesContext)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const jointes = objetId ? pieces.filter((piece) => piece.objet === objet && piece.objet_id === objetId) : []
  const peutJoindre = !readOnly && fiche.droits.peut_ajouter_piece_jointe

  async function joindre(fichier) {
    if (!fichier) return
    setEnvoi(true)
    setErreur('')
    try {
      await avecSuivi(`Envoi de « ${fichier.name} » en cours…`, () => ficheService.ajouterPieceJointe(fiche.id, fichier, { objet, objetId }), {
        succes: 'Preuve jointe : elle figure aussi dans les échanges de la fiche.',
        echec: 'Le fichier n’a pas été joint.',
      })
      await recharger()
      onJoint?.()
    } catch (error) {
      setErreur(errorMessage(error))
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <div className="preuve-jointe">
      {jointes.map((piece) => (
        <button className="preuve-jointe__fichier" key={piece.id} title="Télécharger" type="button" onClick={() => telechargerPiece(piece).catch((error) => setErreur(errorMessage(error)))}>
          <Icon name={piece.type_mime?.startsWith('image/') ? 'eye' : 'file'} size={14} />
          <span>{piece.nom}</span>
        </button>
      ))}
      {peutJoindre && objetId && (
        <>
          <input
            accept={FICHIERS_ACCEPTES}
            className="sar-sr-only"
            disabled={envoi}
            id={id}
            type="file"
            onChange={(event) => { joindre(event.target.files?.[0]); event.target.value = '' }}
          />
          <label aria-disabled={envoi || undefined} className={`preuve-jointe__ajouter${envoi ? ' is-busy' : ''}`} htmlFor={id}>
            {envoi ? <Spinner size="sm" /> : <Icon name="plus" size={14} />}
            {envoi ? 'Envoi en cours…' : compact ? 'Fichier ou photo' : jointes.length ? 'Joindre un autre fichier' : 'Joindre un fichier ou une photo'}
          </label>
        </>
      )}
      {peutJoindre && !objetId && <span className="preuve-jointe__aide">Enregistrez la section pour joindre un fichier ou une photo.</span>}
      {!peutJoindre && !compact && jointes.length === 0 && <span className="preuve-jointe__aide">Aucun fichier joint.</span>}
      {erreur && <span className="preuve-jointe__erreur" role="alert">{erreur}</span>}
    </div>
  )
}

export default PreuveJointe
