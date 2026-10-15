import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import PageBanner from '../../components/shared/PageBanner.jsx'
import { Checkbox, Select, TextArea, TextInput } from '../../components/ui/FormControls.jsx'
import { listOptions } from '../../components/fiche/sections/options.js'
import { ficheService } from '../../services/ficheService.js'
import './FicheNouvelle.css'

const initial = { titre: '', unite_id: '', origine_id: '', origine_precision: '', enonce_probleme: '', equipement_id: '', restreint: false }

/**
 * Déclaration en une étape (T1, PRD §4.1) : le pilote complète le reste ensuite.
 */
function FicheNouvelle() {
  const navigate = useNavigate()
  const [refs, setRefs] = useState(null)
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const formRef = useRef(null)

  useEffect(() => {
    if (Object.keys(errors).length) formRef.current?.querySelector('[aria-invalid="true"]')?.focus()
  }, [errors])

  useEffect(() => { ficheService.referentiels().then(setRefs).catch(() => setMessage('Impossible de charger les listes de choix.')) }, [])

  const set = (field) => (value) => setForm((current) => ({ ...current, [field]: value, ...(field === 'unite_id' ? { equipement_id: '' } : {}) }))
  const origineAutre = refs?.listes?.origine?.find((valeur) => String(valeur.id) === form.origine_id)?.code === 'AUTRE'
  const equipements = (refs?.equipements ?? []).filter((equipement) => String(equipement.unite_id) === form.unite_id).map((equipement) => [String(equipement.id), `${equipement.code} — ${equipement.libelle}`])
  const fieldError = (field) => errors[field]?.[0]

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setErrors({})
    setMessage('')
    try {
      const created = await ficheService.create({
        titre: form.titre,
        unite_id: Number(form.unite_id) || null,
        origine_id: Number(form.origine_id) || null,
        origine_precision: form.origine_precision || null,
        enonce_probleme: form.enonce_probleme,
        equipement_id: Number(form.equipement_id) || null,
        confidentialite: form.restreint ? 'RESTREINT' : 'NORMAL',
      })
      navigate(`/fiches/${created.id}`, { replace: true })
    } catch (error) {
      const fieldErrors = error.data?.errors ?? {}
      setErrors(fieldErrors)
      setMessage(Object.keys(fieldErrors).length ? 'La fiche n’a pas été déclarée : corrigez les champs signalés.' : error.message)
      setSaving(false)
    }
  }

  return (
    <section className="fiche-nouvelle-page">
      <PageBanner title="Déclarer une fiche" />
      <form className="fiche-nouvelle-page__card" noValidate ref={formRef} onSubmit={submit}>
        <Alert severity="info">Déclaration en une étape : le pilote désigné complète ensuite les 12 sections.</Alert>
        {message && <Alert severity="error">{message}</Alert>}
        <TextInput error={fieldError('titre')} label="Titre" required value={form.titre} wide onChange={set('titre')} />
        <div className="fiche-nouvelle-page__grid">
          <Select disabled={!refs} error={fieldError('unite_id')} label="Unité" options={(refs?.unites ?? []).map((unite) => [String(unite.id), unite.libelle])} required value={form.unite_id} onChange={set('unite_id')} />
          <Select disabled={!refs} error={fieldError('origine_id')} label="Origine" options={listOptions(refs, 'origine', 'id')} required value={form.origine_id} onChange={set('origine_id')} />
        </div>
        {origineAutre && <TextInput error={fieldError('origine_precision')} label="Précision de l’origine" required value={form.origine_precision} onChange={set('origine_precision')} />}
        <TextArea error={fieldError('enonce_probleme')} hint="Faits, lieu, période, fréquence." label="Énoncé du problème" required rows={5} value={form.enonce_probleme} onChange={set('enonce_probleme')} />
        <Select
          error={fieldError('equipement_id')}
          hint={form.unite_id ? 'Recommandé quand il est identifié.' : 'Choisissez d’abord l’unité.'}
          label="Équipement"
          options={equipements}
          value={form.equipement_id}
          onChange={set('equipement_id')}
        />
        <Checkbox checked={form.restreint} label="Confidentialité Restreint (Normal par défaut)" onChange={set('restreint')} />
        <div><Button icon="plus" loading={saving} loadingLabel="Déclaration…" type="submit">Déclarer la fiche</Button></div>
      </form>
    </section>
  )
}

export default FicheNouvelle
