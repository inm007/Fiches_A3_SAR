import { useEffect, useState } from 'react'
import Button from '../../ui/Button.jsx'
import Badge from '../../ui/Badge.jsx'
import { Select, TextArea } from '../../ui/FormControls.jsx'
import { describeError, ficheService } from '../../../services/ficheService.js'
import { formatDateTime } from '../../../utils/format.js'
import { toast } from '../../../utils/toast.js'
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
  const [commentaires, setCommentaires] = useState([])
  const [texte, setTexte] = useState('')
  const [sujet, setSujet] = useState('FICHE')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

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
      const commentaire = await ficheService.commenter(fiche.id, texte, contexte, objetId ? Number(objetId) : null)
      setCommentaires((current) => [...current, commentaire])
      setTexte('')
      toast('Commentaire ajouté')
    } catch (error) {
      onError(describeError(error))
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="fiche-tab">
      <h2>Commentaires</h2>
      {loading && <Skeleton lines={3} />}
      {!loading && commentaires.length === 0 && <p className="fiche-tab__muted">Aucun commentaire.</p>}
      {commentaires.map((commentaire) => (
        <article className="fiche-tab__comment" key={commentaire.id}>
          <span className="sar-avatar">{commentaire.auteur.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span>
          <div>
            <strong>{commentaire.auteur}</strong> <span className="fiche-tab__muted">· {formatDateTime(commentaire.created_at)}</span>
            {commentaire.cible && <> <Badge tone="neutral">{commentaire.cible}</Badge></>}
            <div>{commentaire.texte}</div>
          </div>
        </article>
      ))}
      {fiche.droits.peut_commenter && (
        <>
          <Select label="À propos de" options={sujets(fiche)} value={sujet} onChange={setSujet} />
          <TextArea label="Nouveau commentaire" rows={2} value={texte} onChange={setTexte} />
          <div><Button disabled={sending || !texte.trim()} type="button" onClick={send}>{sending ? 'Envoi…' : 'Commenter'}</Button></div>
        </>
      )}
    </section>
  )
}
