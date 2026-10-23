import { useState } from 'react'
import { ficheService } from '../../services/ficheService.js'
import { toast } from '../../utils/toast.js'
import Alert from '../ui/Alert.jsx'
import Button from '../ui/Button.jsx'
import { Select } from '../ui/FormControls.jsx'
import './PartageValidations.css'

const errorText = (error) => Object.values(error.data?.errors ?? {}).flat().join(' ') || error.data?.manques?.join(' ') || error.message

/**
 * Équipe de la fiche, constituée après la validation de la pertinence : des agents et des
 * pilotes actifs, même d'une autre unité. Les membres voient la fiche et renseignent l'analyse
 * et le suivi (sections 5 à 11) ; ils ne valident jamais la fiche et seul le pilote change d'étape.
 */
function EquipeFiche({ fiche, options, onChange }) {
  const [userId, setUserId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const membres = fiche.membres ?? []
  const gerer = fiche.droits?.peut_gerer_equipe
  const exclus = new Set([
    fiche.pilote?.id,
    fiche.identification?.sponsor_id,
    fiche.objectif?.chef_pertinence_id,
    ...(fiche.copilotes ?? []).map((person) => person.id),
    ...membres.map((person) => person.id),
  ].filter(Boolean).map(String))
  const candidats = (options?.membres_possibles ?? []).filter((person) => !exclus.has(String(person.id))).map((person) => [String(person.id), person.nom])

  async function run(task, message) {
    setSaving(true)
    setError('')
    try {
      onChange?.(await task())
      toast(message)
    } catch (saveError) {
      setError(errorText(saveError))
    } finally {
      setSaving(false)
    }
  }

  const ajouter = () => run(async () => {
    const updated = await ficheService.ajouterMembre(fiche.id, Number(userId))
    setUserId('')
    return updated
  }, 'Membre ajouté : il est prévenu')

  return (
    <section className="partage">
      <h3>Équipe de la fiche</h3>
      <p className="partage__meta">Agents et pilotes, même d’une autre unité. Les membres voient la fiche et renseignent l’analyse et le suivi (sections 5 à 11). Ils ne la valident pas ; seul le pilote la soumet et change d’étape.</p>
      {membres.length === 0
        ? <p className="partage__meta">Aucun membre pour l’instant.</p>
        : (
          <ul aria-label="Membres de l’équipe" className="partage__people">
            {membres.map((person) => (
              <li className="partage__person" key={person.id}>
                {person.nom}
                {gerer && (
                  <Button
                    aria-label={`Retirer ${person.nom} de l’équipe`}
                    disabled={saving}
                    icon="x"
                    size="small"
                    type="button"
                    variant="ghost"
                    onClick={() => run(() => ficheService.retirerMembre(fiche.id, person.id), 'Membre retiré')}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      {error && <Alert severity="error">{error}</Alert>}
      {gerer && (
        <div className="partage__form">
          <Select label="Ajouter un membre" options={candidats} value={userId} onChange={setUserId} />
          <Button disabled={!userId} loading={saving} loadingLabel="Ajout…" size="small" type="button" variant="secondary" onClick={ajouter}>Ajouter</Button>
        </div>
      )}
    </section>
  )
}

export default EquipeFiche
