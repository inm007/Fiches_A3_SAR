import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../auth/api.js'
import Alert from '../components/common/Alert.jsx'
import Button from '../components/common/Button.jsx'
import DataTable from '../components/common/DataTable.jsx'
import FormField from '../components/common/FormField.jsx'
import './Technique.css'

const smtpFields = [
  { key: 'SMTP_HOST', label: 'Hôte' },
  { key: 'SMTP_PORT', label: 'Port', type: 'number' },
  { key: 'SMTP_ENCRYPTION', label: 'Chiffrement (tls ou ssl)' },
  { key: 'SMTP_USER', label: 'Utilisateur' },
  { key: 'SMTP_FROM_ADDRESS', label: 'Adresse d’expédition', type: 'email' },
]

const logColumns = [
  { key: 'date', label: 'Date' },
  { key: 'operation', label: 'Opération' },
  { key: 'objet', label: 'Objet' },
  { key: 'detail', label: 'Détail' },
]

function formatDate(value) {
  return value ? new Date(value).toLocaleString('fr-FR', { timeZone: 'Africa/Dakar' }) : '—'
}

function Technique() {
  const [data, setData] = useState(null)
  const [form, setForm] = useState({})
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const applyOverview = useCallback((overview) => {
    setData(overview)
    setForm(Object.fromEntries(smtpFields.map(({ key }) => [key, overview.smtp?.[key] ?? ''])))
  }, [])

  useEffect(() => {
    apiRequest('/technique')
      .then((result) => applyOverview(result.data))
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false))
  }, [applyOverview])

  async function saveSmtp(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    const changes = smtpFields
      .filter(({ key }) => (form[key] ?? '') !== (data.smtp?.[key] ?? ''))
      .map(({ key }) => [key, form[key]])
    if (password) changes.push(['SMTP_PASSWORD', password])

    try {
      for (const [cle, valeur] of changes) {
        await apiRequest('/technique/settings', {
          method: 'PUT',
          body: JSON.stringify({ cle, valeur: valeur === '' ? null : valeur }),
        })
      }
      setPassword('')
      applyOverview((await apiRequest('/technique')).data)
      setNotice(changes.length ? 'Paramètres SMTP enregistrés.' : 'Aucune modification à enregistrer.')
    } catch (saveError) {
      const validationErrors = saveError.data?.errors
      setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : saveError.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="technique-page">Chargement…</div>
  if (!data) return <div className="technique-page"><Alert severity="error">{error || 'Impossible de charger l’état technique.'}</Alert></div>

  const logRows = (data.logs || []).map((log) => ({
    id: log.id,
    date: formatDate(log.created_at),
    operation: log.operation,
    objet: log.objet,
    detail: log.detail ? JSON.stringify(log.detail) : '—',
  }))

  return (
    <section className="technique-page">
      <header>
        <h1>État technique</h1>
        <p>Authentification, courriel, SAP et journal d’administration.</p>
      </header>

      {error && <Alert severity="error">{error}</Alert>}
      {notice && <Alert severity="success">{notice}</Alert>}

      <div className="technique-page__status">
        <div className="technique-page__card">
          <h2>Authentification</h2>
          <p>Fournisseur actif : <strong>{data.auth_provider}</strong></p>
          <p className="technique-page__hint">Annuaire LDAP : point d’extension laissé à la SAR (désactivé).</p>
        </div>
        <div className="technique-page__card">
          <h2>SAP</h2>
          <p>{data.sap_enabled ? 'Branché' : 'Non branché (SAP_ENABLED=false)'}</p>
        </div>
        <div className="technique-page__card">
          <h2>Courriel</h2>
          <p>Transport : <strong>{data.mail_mailer === 'log' ? 'journal (démonstration)' : data.mail_mailer}</strong></p>
        </div>
      </div>

      <form className="technique-page__card technique-page__form" onSubmit={saveSmtp}>
        <h2>Serveur SMTP</h2>
        {smtpFields.map(({ key, label, type }) => (
          <FormField
            key={key}
            id={`smtp-${key}`}
            label={label}
            type={type || 'text'}
            value={form[key] ?? ''}
            onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
          />
        ))}
        <FormField
          id="smtp-password"
          label="Mot de passe"
          type="password"
          autoComplete="new-password"
          value={password}
          hint={data.smtp?.SMTP_PASSWORD_SET ? 'Un mot de passe est enregistré ; laissez vide pour le conserver.' : 'Aucun mot de passe enregistré.'}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
      </form>

      <div className="technique-page__card">
        <h2>Journal d’administration</h2>
        <DataTable columns={logColumns} rows={logRows} emptyMessage="Aucun événement enregistré." />
      </div>
    </section>
  )
}

export default Technique
