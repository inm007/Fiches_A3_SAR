import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import PageBanner from '../../components/shared/PageBanner.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import ListPagination from '../../components/ui/ListPagination.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { FilterSelect, ListToolbar, ResultCount, SearchField, ToolbarActions } from '../../components/shared/ListToolbar.jsx'
import { refreshCounters } from '../../hooks/useCounters.js'
import { notificationService } from '../../services/notificationService.js'
import { formatDateTime } from '../../utils/format.js'
import { downloadExcel } from '../../utils/listTools.js'
import './Notifications.css'

const PAGE_SIZES = [10, 20, 50, 100]

function Notifications() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [query, setQuery] = useState('')
  const [readFilter, setReadFilter] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)

  const filters = useMemo(() => ({
    ...(query.trim() ? { q: query.trim() } : {}),
    ...(readFilter ? { etat: readFilter } : {}),
  }), [query, readFilter])
  const load = useCallback(() => notificationService.list(page, pageSize, filters)
    .then((loaded) => { setResult(loaded); setError('') })
    .catch((loadError) => setError(loadError.message)), [filters, page, pageSize])

  useEffect(() => {
    const timer = window.setTimeout(load, query ? 250 : 0)
    return () => window.clearTimeout(timer)
  }, [load, query])

  async function open(notification) {
    if (!notification.lu) {
      try {
        await notificationService.markRead(notification.id)
        refreshCounters()
      } catch (markError) {
        setError(`Impossible de marquer la notification comme lue : ${markError.message}`)
      }
    }
    if (notification.fiche) navigate(`/fiches/${notification.fiche.id}`)
    else load()
  }

  async function markAll() {
    setMarkingAll(true)
    setError('')
    try {
      await notificationService.markAllRead()
      refreshCounters()
      await load()
    } catch (markError) {
      setError(markError.message)
    } finally {
      setMarkingAll(false)
    }
  }

  const hasUnread = result?.meta.unread_total > 0
  async function exportAll() {
    setExporting(true)
    setError('')
    try {
      const firstPage = await notificationService.list(1, 100, filters)
      const rows = [...firstPage.data]
      for (let currentPage = 2; currentPage <= firstPage.meta.last_page; currentPage += 1) {
        rows.push(...(await notificationService.list(currentPage, 100, filters)).data)
      }
      downloadExcel('notifications.xlsx', [
        { label: 'Date', value: (notification) => formatDateTime(notification.created_at) },
        { label: 'État', value: (notification) => notification.lu ? 'Lue' : 'Non lue' },
        { label: 'N° A3', value: (notification) => notification.fiche?.numero_a3 ?? '' },
        { label: 'Message', value: (notification) => notification.message },
      ], rows)
    } catch (exportError) {
      setError(`L’export a échoué : ${exportError.message}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <section className="notifications-page">
      <PageBanner
        actions={<Button disabled={!hasUnread} icon="ok" loading={markingAll} loadingLabel="Mise à jour…" type="button" variant="success" onClick={markAll}>Tout marquer comme lu</Button>}
        title="Notifications"
      />
      {error && <Alert severity="error">{error}</Alert>}
      {!result && !error && <Skeleton lines={5} height={22} />}
      {result && (
        <ListToolbar>
          <SearchField label="Recherche" placeholder="Message ou numéro de fiche…" value={query} onChange={(value) => { setQuery(value); setPage(1) }} />
          <FilterSelect label="État" options={[['non_lu', 'Non lues'], ['lu', 'Lues']]} value={readFilter} onChange={(value) => { setReadFilter(value); setPage(1) }} />
          <ToolbarActions>
            <ResultCount count={result.meta.total} singular="notification" />
            {(query || readFilter) && <Button onClick={() => { setQuery(''); setReadFilter(''); setPage(1) }} type="button" variant="secondary">Réinitialiser</Button>}
            <Button disabled={!result.meta.total} icon="download" loading={exporting} loadingLabel="Préparation…" type="button" variant="export" onClick={exportAll}>Exporter Excel</Button>
          </ToolbarActions>
        </ListToolbar>
      )}
      {result?.data.length === 0 && (
        <div className="sar-card">
          <EmptyState
            action={(query || readFilter) && <Button type="button" variant="secondary" onClick={() => { setQuery(''); setReadFilter(''); setPage(1) }}>Réinitialiser les filtres</Button>}
            description={(query || readFilter) ? 'Aucune notification ne correspond à ces critères.' : 'Les validations, échéances et changements d’étape de vos fiches apparaîtront ici.'}
            icon="bell"
            title="Aucune notification"
          />
        </div>
      )}
      {result?.data.length > 0 && (
        <ul className="sar-card notifications-page__list">
          {result.data.map((notification) => (
            <li key={notification.id}>
              <button className={`notifications-page__item${notification.lu ? '' : ' is-unread'}`} type="button" onClick={() => open(notification)}>
                <span aria-hidden="true" className={`sar-tile${notification.lu ? ' notifications-page__tile--read' : ''}`}><Icon name="bell" size={18} /></span>
                <span className="notifications-page__body">
                  <span className="notifications-page__message">{notification.message}</span>
                  <span className="notifications-page__meta sar-num">{formatDateTime(notification.created_at)}</span>
                </span>
                <Badge tone={notification.lu ? 'neutral' : 'brand'}>{notification.lu ? 'Lu' : 'Non lu'}</Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
      {result && result.meta.total > 0 && (
        <ListPagination
          page={result.meta.page}
          pageSize={pageSize}
          pageSizes={PAGE_SIZES}
          total={result.meta.total}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
        />
      )}
    </section>
  )
}

export default Notifications
