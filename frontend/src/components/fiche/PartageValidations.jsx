import { useEffect, useState } from 'react'
import { ficheService } from '../../services/ficheService.js'
import { formatDate } from '../../utils/format.js'
import { toast } from '../../utils/toast.js'
import Alert from '../ui/Alert.jsx'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import { Select, TextInput } from '../ui/FormControls.jsx'
import './PartageValidations.css'

const personLabel = (person) => `${person.prenom} ${person.nom} — ${person.identifiant}`
const errorText = (error) => error.data?.manques?.join(' ') || Object.values(error.data?.errors ?? {}).flat().join(' ') || error.message

function DemandeEnAttente({ demande, onSaved }) {
  const [valideurId, setValideurId] = useState('')
  const [motif, setMotif] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function run(task, message) {
    setSaving(true)
    setError('')
    try {
      onSaved(await task())
      toast(message)
    } catch (saveError) {
      setError(errorText(saveError))
    } finally {
      setSaving(false)
    }
  }

  const partager = () => run(async () => {
    const updated = await ficheService.partagerValidation(demande.id, Number(valideurId), motif.trim())
    setValideurId('')
    setMotif('')
    return updated
  }, 'Demande partagée : le valideur associé est prévenu')

  return (
    <li className="partage__item">
      <div className="partage__head">
        <strong>{demande.role?.libelle} · porte {demande.porte}</strong>
        {demande.valideur_indisponible && <Badge tone="retard">Valideur indisponible</Badge>}
        {demande.partages.length > 0 && <Badge tone="brand">Partagée</Badge>}
      </div>
      <p className="partage__meta">Demandée le {formatDate(demande.demandee_le)}. Le premier valideur qui décide traite la demande.</p>
      <ul aria-label="Valideurs de la demande" className="partage__people">
        {demande.valideur && <li className="partage__person">{personLabel(demande.valideur)} <small>titulaire</small></li>}
        {demande.partages.map((person) => (
          <li className="partage__person" key={person.id}>
            {personLabel(person)} <small>associé</small>
            <Button
              aria-label={`Retirer ${person.prenom} ${person.nom} de la demande`}
              disabled={saving}
              icon="x"
              size="small"
              type="button"
              variant="ghost"
              onClick={() => run(() => ficheService.retirerPartageValidation(demande.id, person.id), 'Valideur associé retiré')}
            />
          </li>
        ))}
      </ul>
      {error && <Alert severity="error">{error}</Alert>}
      {demande.candidats.length === 0
        ? <p className="partage__meta">Aucun autre titulaire actif de ce rôle. Créez d’abord une affectation.</p>
        : (
          <div className="partage__form">
            <Select label="Partager avec" options={demande.candidats.map((person) => [String(person.id), personLabel(person)])} value={valideurId} onChange={setValideurId} />
            <TextInput label="Motif" placeholder="Absence, maladie, départ…" required value={motif} onChange={setMotif} />
            <Button disabled={!valideurId || !motif.trim()} loading={saving} loadingLabel="Envoi…" size="small" type="button" variant="secondary" onClick={partager}>Partager</Button>
          </div>
        )}
    </li>
  )
}

/**
 * Administrateur fonctionnel : demandes de validation en attente d'une fiche, partagées avec
 * un autre titulaire du même rôle (absence, maladie, départ). Les deux valideurs voient la
 * demande et le premier qui décide la traite ; le titulaire la retrouve à son retour.
 */
function PartageValidations({ ficheId, onChange }) {
  const [demandes, setDemandes] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    ficheService.validationsEnAttente(ficheId)
      .then((data) => { if (active) setDemandes(data) })
      .catch((loadError) => { if (active) setError(loadError.message) })
    return () => { active = false }
  }, [ficheId])

  function replace(updated) {
    setDemandes((current) => current.map((demande) => (demande.id === updated.id ? updated : demande)))
    onChange?.()
  }

  if (error) return <Alert severity="error">{error}</Alert>
  if (demandes === null) return null
  if (demandes.length === 0) return <p className="partage__meta">Aucune validation en attente sur cette fiche.</p>

  return (
    <section className="partage">
      <h3>Validations en attente</h3>
      <ul>
        {demandes.map((demande) => <DemandeEnAttente demande={demande} key={demande.id} onSaved={replace} />)}
      </ul>
    </section>
  )
}

export default PartageValidations
