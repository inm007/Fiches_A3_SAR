import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../auth/api.js'
import Alert from '../components/common/Alert.jsx'
import Button from '../components/common/Button.jsx'
import DataTable from '../components/common/DataTable.jsx'
import FormField from '../components/common/FormField.jsx'
import ListPagination from '../components/common/ListPagination.jsx'
import { downloadExcel } from '../utils/listTools.js'
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
  const [logsResult, setLogsResult] = useState(null)
  const [logQuery, setLogQuery] = useState('')
  const [logOperation, setLogOperation] = useState('')
  const [logPage, setLogPage] = useState(1)
  const [logPageSize, setLogPageSize] = useState(25)
  const [logsError, setLogsError] = useState('')
  const [exportingLogs, setExportingLogs] = useState(false)
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

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ page: String(logPage), per_page: String(logPageSize) })
      if (logQuery.trim()) params.set('q', logQuery.trim())
      if (logOperation) params.set('operation', logOperation)
      apiRequest(`/technique/logs?${params}`)
        .then((result) => { if (active) { setLogsResult(result); setLogsError('') } })
        .catch((loadError) => { if (active) setLogsError(loadError.message) })
    }, logQuery ? 250 : 0)
    return () => { active = false; window.clearTimeout(timer) }
  }, [logOperation, logPage, logPageSize, logQuery])

  async function exportLogs() {
    setExportingLogs(true)
    setLogsError('')
    try {
      const rows = []
      let page = 1
      let lastPage = 1
      do {
        const params = new URLSearchParams({ page: String(page), per_page: '100' })
        if (logQuery.trim()) params.set('q', logQuery.trim())
        if (logOperation) params.set('operation', logOperation)
        const result = await apiRequest(`/technique/logs?${params}`)
        rows.push(...result.data)
        lastPage = result.meta.last_page
        page += 1
      } while (page <= lastPage)
      downloadExcel('journal-administration.xlsx', [
        { label: 'Date', value: (log) => formatDate(log.created_at) },
        { label: 'Auteur', value: (log) => log.auteur },
        { label: 'Opération', value: (log) => log.operation },
        { label: 'Objet', value: (log) => log.objet },
        { label: 'Détail', value: (log) => log.detail ? JSON.stringify(log.detail) : '' },
      ], rows)
    } catch (exportError) {
      setLogsError(`L’export a échoué : ${exportError.message}`)
    } finally {
      setExportingLogs(false)
    }
  }

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

  const logRows = (logsResult?.data || []).map((log) => ({
    id: log.id,
    date: formatDate(log.created_at),
    auteur: log.auteur,
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
        {logsError && <Alert severity="error">{logsError}</Alert>}
        <div className="technique-page__log-tools sar-list-toolbar">
          <label className="sar-list-toolbar__search">Rechercher<input onChange={(event) => { setLogQuery(event.target.value); setLogPage(1) }} placeholder="Opération, objet ou auteur…" type="search" value={logQuery} /></label>
          <label>Opération<select onChange={(event) => { setLogOperation(event.target.value); setLogPage(1) }} value={logOperation}>
            <option value="">Toutes</option>
            {(logsResult?.meta.operations ?? []).map((operation) => <option key={operation} value={operation}>{operation}</option>)}
          </select></label>
          <span className="sar-list-toolbar__count">{logsResult?.meta.total ?? 0} événement{logsResult?.meta.total !== 1 ? 's' : ''}</span>
          <Button disabled={exportingLogs || !logsResult?.meta.total} type="button" variant="export" onClick={exportLogs}>{exportingLogs ? 'Préparation…' : 'Exporter Excel'}</Button>
        </div>
        <DataTable columns={[{ key: 'date', label: 'Date' }, { key: 'auteur', label: 'Auteur' }, ...logColumns.slice(1)]} rows={logRows} emptyMessage="Aucun événement enregistré." />
        {logsResult?.meta.total > 0 && (
          <ListPagination
            page={logsResult.meta.page}
            pageSize={logPageSize}
            total={logsResult.meta.total}
            onPageChange={setLogPage}
            onPageSizeChange={(size) => { setLogPageSize(size); setLogPage(1) }}
          />
        )}
      </div>
    </section>
  )
}

export default Technique
