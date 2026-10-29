import { useEffect, useRef, useState } from 'react'
import Button from '../../ui/Button.jsx'
import { useAuth } from '../../../auth/useAuth.js'
import { Select, TextArea } from '../../ui/FormControls.jsx'
import { describeError, ficheService } from '../../../services/ficheService.js'
import { formatDateTime } from '../../../utils/format.js'
import { avecSuivi } from '../../../utils/toast.js'
import Skeleton from '../../ui/Skeleton.jsx'
import './FicheTab.css'

// « À propos de » : la fiche, une de ses actions ou une de ses validations (« ACTION:12 »).
function sujets(fiche) {
  return [
    ['FICHE', 'La fiche'],
    ...fiche.actions.map((action) => [`ACTION:${action.id}`, `Action : ${action.description}`]),
    ...fiche.validations.map((validation) => [`VALIDATION:${validation.id}`, `Validation porte ${validation.porte} — ${validation.role?.libelle ?? ''}`]),
  ]
}

export default function CommentairesTab({ fiche, onError }) {
  const { user } = useAuth()
  const [commentaires, setCommentaires] = useState([])
  const [texte, setTexte] = useState('')
  const [sujet, setSujet] = useState('FICHE')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const filRef = useRef(null)

  // Le fil s'ouvre sur le dernier message, comme une messagerie.
  useEffect(() => {
    const fil = filRef.current
    if (fil) fil.scrollTop = fil.scrollHeight
  }, [commentaires, loading])

  useEffect(() => {
    let active = true
    ficheService.commentaires(fiche.id)
      .then((data) => { if (active) setCommentaires(data) })
      .catch((error) => { if (active) onError(describeError(error)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [fiche.id, onError])

  async function send() {
    setSending(true)
    try {
      const [contexte, objetId] = sujet.split(':')
      const commentaire = await avecSuivi('Envoi du message en cours…', () => ficheService.commenter(fiche.id, texte, contexte, objetId ? Number(objetId) : null), {
        succes: 'Message envoyé',
        echec: 'Le message n’est pas parti.',
      })
      setCommentaires((current) => [...current, commentaire])
      setTexte('')
    } catch (error) {
      onError(describeError(error))
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="fiche-tab fiche-tab--fil">
      <div className="fiche-tab__title">
        <h2>Discussion</h2>
        {commentaires.length > 0 && <span className="fiche-tab__muted">{commentaires.length} message{commentaires.length > 1 ? 's' : ''}</span>}
      </div>
      <div className="fiche-tab__fil discussion" ref={filRef} tabIndex={-1}>
        {loading && <Skeleton lines={3} />}
        {!loading && commentaires.length === 0 && (
          <p className="discussion__vide">Pas encore de message. Posez une question ou partagez une information avec l’équipe de la fiche.</p>
        )}
        {commentaires.map((commentaire) => {
          const moi = commentaire.auteur_id === user?.id
          return (
            <article className={`discussion__message${moi ? ' is-moi' : ''}`} key={commentaire.id}>
              {!moi && <span aria-hidden="true" className="sar-avatar">{commentaire.auteur.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span>}
              <div className="discussion__bulle">
                <span className="discussion__meta">
                  <b>{moi ? 'Vous' : commentaire.auteur}</b> · {formatDateTime(commentaire.created_at)}
                </span>
                {commentaire.cible && <span className="discussion__cible">À propos de : {commentaire.cible}</span>}
                <p>{commentaire.texte}</p>
              </div>
            </article>
          )
        })}
      </div>
      {fiche.droits.peut_commenter && (
        <div className="fiche-tab__composer">
          <TextArea label="Votre message" placeholder="Écrire un message à l’équipe de la fiche…" value={texte} onChange={setTexte} />
          <div className="discussion__envoi">
            <Select label="À propos de" options={sujets(fiche)} placeholder={null} value={sujet} onChange={setSujet} />
            <Button disabled={!texte.trim()} loading={sending} loadingLabel="Envoi…" type="button" onClick={send}>Envoyer</Button>
          </div>
        </div>
      )}
    </section>
  )
}
