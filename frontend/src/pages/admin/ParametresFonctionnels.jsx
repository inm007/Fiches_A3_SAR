import { useEffect, useState } from 'react'
import { apiRequest } from '../../auth/api.js'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import { Checkbox, TextInput } from '../../components/ui/FormControls.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import PageBanner from '../../components/shared/PageBanner.jsx'
import { toast } from '../../utils/toast.js'
import './ParametresFonctionnels.css'

const defaults = {
  reminder_interval_days: 7,
  validation_reminders_enabled: true,
  due_soon_days: 3,
  attachment_max_size_mb: 10,
  attachment_max_files: 20,
}

function ParametresFonctionnels() {
  const [values, setValues] = useState(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    apiRequest('/admin/settings')
      .then((result) => setValues({ ...defaults, ...result.data }))
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false))
  }, [])

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setFieldErrors({})
    try {
      const result = await apiRequest('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          ...values,
          reminder_interval_days: Number(values.reminder_interval_days),
          due_soon_days: Number(values.due_soon_days),
          attachment_max_size_mb: Number(values.attachment_max_size_mb),
          attachment_max_files: Number(values.attachment_max_files),
        }),
      })
      setValues({ ...defaults, ...result.data })
      toast.success('Paramètres enregistrés.')
    } catch (saveError) {
      const validationErrors = saveError.data?.errors ?? {}
      const orphans = Object.entries(validationErrors).filter(([name]) => !(name in defaults)).flatMap(([, messages]) => messages)
      setFieldErrors(validationErrors)
      setError(Object.keys(validationErrors).length ? orphans.join(' ') : saveError.message)
    } finally {
      setSaving(false)
    }
  }

  const set = (field) => (value) => setValues((current) => ({ ...current, [field]: value }))

  return (
    <section className="parametres-fonctionnels-page">
      <PageBanner description="Réglez les rappels automatiques et les limites des pièces jointes." title="Paramètres fonctionnels" />
      {error && <Alert severity="error">{error}</Alert>}
      {loading ? <Skeleton height={44} lines={4} /> : (
        <form className="parametres-fonctionnels-page__form" noValidate onSubmit={save}>
          <fieldset disabled={saving}>
            <legend>Relances</legend>
            <TextInput error={fieldErrors.reminder_interval_days} label="Cadence des rappels automatiques (jours)" min={1} required type="number" value={values.reminder_interval_days} onChange={set('reminder_interval_days')} />
            <Checkbox checked={Boolean(values.validation_reminders_enabled)} label="Activer les rappels pour les validations en attente" onChange={set('validation_reminders_enabled')} />
            <TextInput error={fieldErrors.due_soon_days} hint="Le responsable reçoit une notification quand l’échéance de son action approche." label="Prévenir avant l’échéance d’une action (jours)" max={30} min={1} required type="number" value={values.due_soon_days} onChange={set('due_soon_days')} />
            <p>Tous les rappels arrivent dans les notifications : actions en retard ou proches de l’échéance, validations en attente, contrôles d’efficacité disponibles. Ils partent chaque jour à 7 h.</p>
          </fieldset>
          <fieldset disabled={saving}>
            <legend>Pièces jointes</legend>
            <TextInput error={fieldErrors.attachment_max_size_mb} label="Taille maximale par fichier (Mo)" min={1} required type="number" value={values.attachment_max_size_mb} onChange={set('attachment_max_size_mb')} />
            <TextInput error={fieldErrors.attachment_max_files} label="Nombre maximal de fichiers par fiche" min={1} required type="number" value={values.attachment_max_files} onChange={set('attachment_max_files')} />
            <p>Les contrôles de type de fichier et de taille sont également appliqués par l’API.</p>
          </fieldset>
          <Button loading={saving} loadingLabel="Enregistrement…" type="submit">Enregistrer les paramètres</Button>
        </form>
      )}
    </section>
  )
}

export default ParametresFonctionnels
