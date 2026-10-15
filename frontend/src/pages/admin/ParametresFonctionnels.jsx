import { useEffect, useState } from 'react'
import { apiRequest } from '../../auth/api.js'
import Button from '../../components/common/Button.jsx'
import PageBanner from '../../components/common/PageBanner.jsx'
import './ParametresFonctionnels.css'

const defaults = {
  reminder_interval_days: 7,
  validation_reminders_enabled: true,
  attachment_max_size_mb: 10,
  attachment_max_files: 20,
}

function ParametresFonctionnels() {
  const [values, setValues] = useState(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

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
    setNotice('')
    try {
      const result = await apiRequest('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          ...values,
          reminder_interval_days: Number(values.reminder_interval_days),
          attachment_max_size_mb: Number(values.attachment_max_size_mb),
          attachment_max_files: Number(values.attachment_max_files),
        }),
      })
      setValues({ ...defaults, ...result.data })
      setNotice('Paramètres enregistrés.')
    } catch (saveError) {
      const validationErrors = saveError.data?.errors
      setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : saveError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="parametres-fonctionnels-page">
      <PageBanner description="Réglez les rappels automatiques et les limites des pièces jointes." title="Paramètres fonctionnels" />
      {error && <p className="parametres-fonctionnels-page__message parametres-fonctionnels-page__message--error" role="alert">{error}</p>}
      {notice && <p className="parametres-fonctionnels-page__message parametres-fonctionnels-page__message--success" role="status">{notice}</p>}
      <form className="parametres-fonctionnels-page__form" onSubmit={save}>
        <fieldset disabled={loading || saving}>
          <legend>Relances</legend>
          <label>
            Cadence des rappels automatiques (jours)
            <input
              min="1"
              onChange={(event) => setValues({ ...values, reminder_interval_days: event.target.value })}
              required
              type="number"
              value={values.reminder_interval_days}
            />
          </label>
          <label className="parametres-fonctionnels-page__checkbox">
            <input
              checked={Boolean(values.validation_reminders_enabled)}
              onChange={(event) => setValues({ ...values, validation_reminders_enabled: event.target.checked })}
              type="checkbox"
            />
            Activer les rappels pour les validations en attente
          </label>
        </fieldset>
        <fieldset disabled={loading || saving}>
          <legend>Pièces jointes</legend>
          <label>
            Taille maximale par fichier (Mo)
            <input
              min="1"
              onChange={(event) => setValues({ ...values, attachment_max_size_mb: event.target.value })}
              required
              type="number"
              value={values.attachment_max_size_mb}
            />
          </label>
          <label>
            Nombre maximal de fichiers par fiche
            <input
              min="1"
              onChange={(event) => setValues({ ...values, attachment_max_files: event.target.value })}
              required
              type="number"
              value={values.attachment_max_files}
            />
          </label>
          <p>Les contrôles de type de fichier et de taille sont également appliqués par l’API.</p>
        </fieldset>
        <Button disabled={loading || saving} type="submit">{saving ? 'Enregistrement…' : 'Enregistrer les paramètres'}</Button>
      </form>
    </section>
  )
}

export default ParametresFonctionnels
