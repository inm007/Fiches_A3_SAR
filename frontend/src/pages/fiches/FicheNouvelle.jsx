import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import EtapeBadge from '../../components/fiche/EtapeBadge.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import PageBanner from '../../components/shared/PageBanner.jsx'
import { Checkbox, Select, TextArea, TextInput } from '../../components/ui/FormControls.jsx'
import { listOptions } from '../../components/fiche/sections/options.js'
import { ficheService } from '../../services/ficheService.js'
import './FicheNouvelle.css'

const initial = { titre: '', unite_id: '', origine_id: '', origine_precision: '', enonce_probleme: '', equipement_id: '', restreint: false, piloter: true }

/**
 * Déclaration en une étape (T1, PRD §4.1) : le pilote complète le reste ensuite.
 */
function FicheNouvelle() {
  const navigate = useNavigate()
  const { activeProfile } = useAuth()
  const [refs, setRefs] = useState(null)
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const formRef = useRef(null)
  const [doublons, setDoublons] = useState([])
  // Un pilote déclarant une fiche de son unité peut la piloter tout de suite ; sinon l'administrateur désignera le pilote.
  const peutPiloter = activeProfile?.role_code === 'PILOTE' && form.unite_id !== '' && String(activeProfile.unite_id) === form.unite_id

  // Fiches encore ouvertes sur le même équipement : un doublon se repère avant de déclarer.
  useEffect(() => {
    if (!form.equipement_id) return undefined
    let actif = true
    ficheService.list({ equipement_id: form.equipement_id, per_page: 20 })
      .then((result) => { if (actif) setDoublons(result.data.filter((fiche) => !['CLOTURE', 'CLASSE'].includes(fiche.statut_general))) })
      .catch(() => { if (actif) setDoublons([]) })
    return () => { actif = false }
  }, [form.equipement_id])

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
        piloter: peutPiloter && form.piloter,
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
      <PageBanner description="Le pilote de l’unité complétera ensuite la fiche. Vous serez prévenu à chaque étape." title="Déclarer une fiche" />
      <form className="fiche-nouvelle-page__card" noValidate ref={formRef} onSubmit={submit}>
        {message && <Alert severity="error">{message}</Alert>}
        <TextInput error={fieldError('titre')} label="Titre" required value={form.titre} wide onChange={set('titre')} />
        <div className="fiche-nouvelle-page__grid">
          <Select disabled={!refs} error={fieldError('unite_id')} label="Unité" options={(refs?.unites ?? []).map((unite) => [String(unite.id), unite.libelle])} required value={form.unite_id} onChange={set('unite_id')} />
          <Select disabled={!refs} error={fieldError('origine_id')} label="Origine" options={listOptions(refs, 'origine', 'id')} required value={form.origine_id} onChange={set('origine_id')} />
        </div>
        {origineAutre && <TextInput error={fieldError('origine_precision')} label="Précision de l’origine" required value={form.origine_precision} onChange={set('origine_precision')} />}
        <TextArea error={fieldError('enonce_probleme')} hint="Ce qui se passe, sans supposer la cause : où, quand, combien de fois." label="Énoncé du problème" required rows={5} value={form.enonce_probleme} onChange={set('enonce_probleme')} />
        <Select
          error={fieldError('equipement_id')}
          hint={form.unite_id ? 'Recommandé quand il est identifié.' : 'Choisissez d’abord l’unité.'}
          label="Équipement"
          options={equipements}
          value={form.equipement_id}
          onChange={set('equipement_id')}
        />
        {form.equipement_id && doublons.length > 0 && (
          <Alert severity="warning">
            <strong>{doublons.length === 1 ? 'Une fiche est déjà ouverte' : `${doublons.length} fiches sont déjà ouvertes`} sur cet équipement.</strong> Vérifiez qu’il ne s’agit pas du même problème :
            <ul className="fiche-nouvelle-page__doublons">
              {doublons.slice(0, 5).map((fiche) => (
                <li key={fiche.id}><Link target="_blank" to={`/fiches/${fiche.id}`}>{fiche.numero_a3} · {fiche.titre}</Link> <EtapeBadge etape={fiche.statut_etape} /></li>
              ))}
            </ul>
          </Alert>
        )}
        {peutPiloter && (
          <Checkbox checked={form.piloter} label="Je pilote cette fiche (vous êtes pilote de cette unité)" onChange={set('piloter')} />
        )}
        {activeProfile?.role_code !== 'PILOTE' && (
          <p className="fiche-nouvelle-page__note">L’administrateur désignera un pilote de l’unité après la déclaration.</p>
        )}
        {activeProfile?.role_code === 'PILOTE' && form.unite_id && !peutPiloter && (
          <p className="fiche-nouvelle-page__note">Cette unité n’est pas la vôtre : l’administrateur désignera un pilote de l’unité.</p>
        )}
        <Checkbox checked={form.restreint} label="Confidentialité Restreint (Normal par défaut)" onChange={set('restreint')} />
        <div className="fiche-nouvelle-page__submit"><Button icon="plus" loading={saving} loadingLabel="Déclaration…" type="submit">Déclarer la fiche</Button></div>
      </form>
    </section>
  )
}

export default FicheNouvelle
