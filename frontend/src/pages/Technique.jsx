import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../auth/api.js'
import Alert from '../components/ui/Alert.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import DataTable from '../components/ui/DataTable.jsx'
import { TextInput } from '../components/ui/FormControls.jsx'
import ListPagination from '../components/ui/ListPagination.jsx'
import { FilterSelect, ListToolbar, ResultCount, SearchField, ToolbarActions } from '../components/shared/ListToolbar.jsx'
import PageBanner from '../components/shared/PageBanner.jsx'
import PageLoader from '../components/shared/PageLoader.jsx'
import { downloadExcel } from '../utils/listTools.js'
import { toast } from '../utils/toast.js'
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
  { key: 'auteur', label: 'Auteur' },
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
  const [fieldErrors, setFieldErrors] = useState({})

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
    setFieldErrors({})
    const changes = smtpFields
      .filter(({ key }) => (form[key] ?? '') !== (data.smtp?.[key] ?? ''))
      .map(({ key }) => [key, form[key]])
    if (password) changes.push(['SMTP_PASSWORD', password])

    let current = null
    try {
      for (const [cle, valeur] of changes) {
        current = cle
        await apiRequest('/technique/settings', {
          method: 'PUT',
          body: JSON.stringify({ cle, valeur: valeur === '' ? null : valeur }),
        })
      }
      setPassword('')
      applyOverview((await apiRequest('/technique')).data)
      if (changes.length) toast.success('Paramètres SMTP enregistrés.')
      else toast.info('Aucune modification à enregistrer.')
    } catch (saveError) {
      // Chaque paramètre est envoyé seul : l'erreur de validation s'affiche sous le champ concerné.
      const validationErrors = saveError.data?.errors
      if (validationErrors && current) setFieldErrors({ [current]: Object.values(validationErrors).flat() })
      else setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader label="Chargement de l’état technique…" />
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
      <PageBanner description="Authentification, courriel, SAP et journal d’administration." title="État technique" />

      {error && <Alert severity="error">{error}</Alert>}

      <div className="technique-page__status">
        <Card title="Authentification">
          <p>Fournisseur actif : <strong>{data.auth_provider}</strong></p>
          <p className="sar-caption">Annuaire LDAP : point d’extension laissé à la SAR (désactivé).</p>
        </Card>
        <Card title="SAP">
          <Badge tone={data.sap_enabled ? 'active' : 'inactive'}>{data.sap_enabled ? 'Branché' : 'Non branché'}</Badge>
          {!data.sap_enabled && <p className="sar-caption">SAP_ENABLED=false</p>}
        </Card>
        <Card title="Courriel">
          <p>Transport : <strong>{data.mail_mailer === 'log' ? 'journal (démonstration)' : data.mail_mailer}</strong></p>
        </Card>
      </div>

      <Card title="Serveur SMTP">
        <form className="technique-page__form" noValidate onSubmit={saveSmtp}>
          {smtpFields.map(({ key, label, type }) => (
            <TextInput
              autoComplete="off"
              error={fieldErrors[key]}
              key={key}
              label={label}
              type={type || 'text'}
              value={form[key]}
              onChange={(value) => setForm((current) => ({ ...current, [key]: value }))}
            />
          ))}
          <TextInput
            autoComplete="new-password"
            error={fieldErrors.SMTP_PASSWORD}
            hint={data.smtp?.SMTP_PASSWORD_SET ? 'Un mot de passe est enregistré ; laissez vide pour le conserver.' : 'Aucun mot de passe enregistré.'}
            label="Mot de passe"
            type="password"
            value={password}
            onChange={setPassword}
          />
          <div><Button loading={saving} loadingLabel="Enregistrement…" type="submit">Enregistrer</Button></div>
        </form>
      </Card>

      <Card title="Journal d’administration">
        <div className="technique-page__logs">
          {logsError && <Alert severity="error">{logsError}</Alert>}
          <ListToolbar>
            <SearchField placeholder="Opération, objet ou auteur…" value={logQuery} onChange={(value) => { setLogQuery(value); setLogPage(1) }} />
            <FilterSelect
              label="Opération"
              options={(logsResult?.meta.operations ?? []).map((operation) => [operation, operation])}
              value={logOperation}
              onChange={(value) => { setLogOperation(value); setLogPage(1) }}
            />
            <ToolbarActions>
              <ResultCount count={logsResult?.meta.total ?? 0} singular="événement" />
              <Button disabled={!logsResult?.meta.total} icon="download" loading={exportingLogs} loadingLabel="Préparation…" type="button" variant="secondary" onClick={exportLogs}>Exporter Excel</Button>
            </ToolbarActions>
          </ListToolbar>
          <DataTable columns={logColumns} emptyMessage="Aucun événement enregistré." loading={!logsResult && !logsError} rows={logRows} />
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
      </Card>
    </section>
  )
}

export default Technique
