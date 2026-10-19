import { useState } from 'react'
import { ficheService } from '../../services/ficheService.js'
import { toast } from '../../utils/toast.js'
import Alert from '../ui/Alert.jsx'
import Button from '../ui/Button.jsx'
import { Select, TextInput } from '../ui/FormControls.jsx'
import './PartageValidations.css'

const errorText = (error) => Object.values(error.data?.errors ?? {}).flat().join(' ') || error.data?.manques?.join(' ') || error.message

/**
 * Administrateur fonctionnel : partage d'une fiche avec un second pilote (maladie, congé,
 * renfort). Les deux pilotes voient tout ce que l'autre a fait et poursuivent la fiche ;
 * le pilote désigné le reste, et le partage se retire quand il n'est plus utile.
 *
 * `pilote` et `copilotes` : { id, label } ; `candidats` : [[id, libellé]] des titulaires du rôle Pilote.
 */
function PartageFiche({ ficheId, pilote, copilotes, candidats, onChange }) {
  const [userId, setUserId] = useState('')
  const [motif, setMotif] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const dejaPilotes = new Set([pilote?.id, ...copilotes.map((person) => person.id)].filter(Boolean).map(String))
  const options = candidats.filter(([id]) => !dejaPilotes.has(String(id)))

  async function run(task, message) {
    setSaving(true)
    setError('')
    try {
      onChange(await task())
      toast(message)
    } catch (saveError) {
      setError(errorText(saveError))
    } finally {
      setSaving(false)
    }
  }

  const partager = () => run(async () => {
    const updated = await ficheService.partagerFiche(ficheId, Number(userId), motif.trim())
    setUserId('')
    setMotif('')
    return updated
  }, 'Fiche partagée : les deux pilotes sont prévenus')

  if (!pilote) return <p className="partage__meta">Désignez d’abord le pilote de la fiche.</p>

  return (
    <section className="partage">
      <h3>Pilotes de la fiche</h3>
      <p className="partage__meta">Les pilotes d’une fiche partagée voient ce que l’autre a fait (historique, dernier enregistrement de chaque section) et poursuivent la fiche ensemble.</p>
      <ul aria-label="Pilotes de la fiche" className="partage__people">
        <li className="partage__person">{pilote.label} <small>pilote désigné</small></li>
        {copilotes.map((person) => (
          <li className="partage__person" key={person.id}>
            {person.label} <small>pilote associé</small>
            <Button
              aria-label={`Retirer ${person.label} de la fiche`}
              disabled={saving}
              icon="x"
              size="small"
              type="button"
              variant="ghost"
              onClick={() => run(() => ficheService.retirerCopilote(ficheId, person.id), 'Partage retiré')}
            />
          </li>
        ))}
      </ul>
      {error && <Alert severity="error">{error}</Alert>}
      {options.length === 0
        ? <p className="partage__meta">Aucun autre pilote actif dans l’unité de la fiche.</p>
        : (
          <div className="partage__form">
            <Select label="Partager avec" options={options} value={userId} onChange={setUserId} />
            <TextInput label="Motif" placeholder="Arrêt maladie, congé, renfort…" required value={motif} onChange={setMotif} />
            <Button disabled={!userId || !motif.trim()} loading={saving} loadingLabel="Envoi…" size="small" type="button" variant="secondary" onClick={partager}>Partager</Button>
          </div>
        )}
    </section>
  )
}

export default PartageFiche
