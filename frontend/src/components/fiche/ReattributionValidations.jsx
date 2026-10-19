import { useEffect, useState } from 'react'
import { ficheService } from '../../services/ficheService.js'
import { formatDate } from '../../utils/format.js'
import { toast } from '../../utils/toast.js'
import Alert from '../ui/Alert.jsx'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import { Select, TextInput } from '../ui/FormControls.jsx'
import './ReattributionValidations.css'

const personLabel = (person) => `${person.prenom} ${person.nom} — ${person.identifiant}`

function DemandeEnAttente({ demande, onSaved }) {
  const [valideurId, setValideurId] = useState('')
  const [motif, setMotif] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const candidats = demande.candidats.filter((person) => person.id !== demande.valideur?.id)

  async function save() {
    setSaving(true)
    setError('')
    try {
      onSaved(await ficheService.reattribuerValidation(demande.id, Number(valideurId), motif || null))
      setValideurId('')
      setMotif('')
      toast('Demande réattribuée')
    } catch (saveError) {
      setError(saveError.data?.manques?.join(' ') || saveError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className="reattribution__item">
      <div className="reattribution__head">
        <strong>{demande.role?.libelle} · porte {demande.porte}</strong>
        {demande.valideur_indisponible && <Badge tone="retard">Valideur indisponible</Badge>}
      </div>
      <p className="reattribution__meta">
        {demande.valideur ? personLabel(demande.valideur) : 'Aucun valideur'} · demandée le {formatDate(demande.demandee_le)}
      </p>
      {error && <Alert severity="error">{error}</Alert>}
      {candidats.length === 0
        ? <p className="reattribution__meta">Aucun autre titulaire actif de ce rôle. Créez d’abord une affectation.</p>
        : (
          <div className="reattribution__form">
            <Select label="Nouveau valideur" options={candidats.map((person) => [String(person.id), personLabel(person)])} value={valideurId} onChange={setValideurId} />
            <TextInput label="Motif" placeholder="Absence, départ…" value={motif} onChange={setMotif} />
            <Button disabled={!valideurId} loading={saving} loadingLabel="Envoi…" size="small" type="button" variant="secondary" onClick={save}>Réattribuer</Button>
          </div>
        )}
    </li>
  )
}

/**
 * Administrateur fonctionnel : demandes de validation en attente d'une fiche et
 * réattribution à un autre titulaire du même rôle (absence, départ, changement d'affectation).
 */
function ReattributionValidations({ ficheId, onChange }) {
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
  if (demandes === null || demandes.length === 0) return null

  return (
    <section className="reattribution">
      <h3>Validations en attente</h3>
      <ul>
        {demandes.map((demande) => <DemandeEnAttente demande={demande} key={demande.id} onSaved={replace} />)}
      </ul>
    </section>
  )
}

export default ReattributionValidations
