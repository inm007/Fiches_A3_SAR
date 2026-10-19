import { useEffect, useState } from 'react'
import { apiRequest } from '../auth/api.js'
import Alert from '../components/ui/Alert.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import DataTable from '../components/ui/DataTable.jsx'
import ListPagination from '../components/ui/ListPagination.jsx'
import { FilterSelect, ListToolbar, ResultCount, SearchField, ToolbarActions } from '../components/shared/ListToolbar.jsx'
import PageBanner from '../components/shared/PageBanner.jsx'
import PageLoader from '../components/shared/PageLoader.jsx'
import { downloadExcel } from '../utils/listTools.js'
import './Technique.css'

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
  const [logPageSize, setLogPageSize] = useState(10)
  const [logsError, setLogsError] = useState('')
  const [exportingLogs, setExportingLogs] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiRequest('/technique')
      .then((result) => setData(result.data))
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false))
  }, [])

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
          <p className="sar-caption">Serveur configuré dans le fichier .env (MAIL_*).</p>
        </Card>
      </div>

      <Card title="Journal d’administration">
        <div className="technique-page__logs">
          {logsError && <Alert severity="error">{logsError}</Alert>}
          <ListToolbar plain>
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
