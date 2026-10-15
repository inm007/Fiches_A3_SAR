import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import PageBanner from '../../components/shared/PageBanner.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import ListPagination from '../../components/ui/ListPagination.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import Badge from '../../components/ui/Badge.jsx'
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
        actions={(
          <div className="notifications-page__header-actions">
          <Button disabled={exporting || !result?.meta.total} type="button" variant="export" onClick={exportAll}>{exporting ? 'Préparation…' : 'Exporter Excel'}</Button>
          <Button disabled={!hasUnread || markingAll} type="button" variant="success" onClick={markAll}>{markingAll ? 'Mise à jour…' : 'Tout marquer comme lu'}</Button>
          </div>
        )}
        title="Notifications"
      />
      {error && <Alert severity="error">{error}</Alert>}
      {!result && !error && <Skeleton />}
      {result && (
        <div className="notifications-page__filters sar-list-toolbar">
          <label className="sar-list-toolbar__search">Recherche<input onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Message ou numéro de fiche…" type="search" value={query} /></label>
          <label>État
            <select onChange={(event) => { setReadFilter(event.target.value); setPage(1) }} value={readFilter}>
              <option value="">Toutes</option>
              <option value="non_lu">Non lues</option>
              <option value="lu">Lues</option>
            </select>
          </label>
          {(query || readFilter) && <Button onClick={() => { setQuery(''); setReadFilter(''); setPage(1) }} type="button" variant="secondary">Réinitialiser</Button>}
          <span className="sar-list-toolbar__count">{result.meta.total} notification{result.meta.total !== 1 ? 's' : ''}</span>
        </div>
      )}
      {result?.data.length === 0 && <EmptyState description="Les validations, échéances et changements d’étape de vos fiches apparaîtront ici." title="Aucune notification" />}
      {result?.data.length > 0 && (
        <div className="sar-card notifications-page__list">
          {result.data.map((notification) => (
            <button className={`sar-list-item notifications-page__item${notification.lu ? '' : ' is-unread'}`} key={notification.id} type="button" onClick={() => open(notification)}>
              <Badge tone={notification.lu ? 'neutral' : 'brand'}>{notification.lu ? 'Lu' : 'Non lu'}</Badge>
              <div>
                {notification.message}
                <div className="sar-muted notifications-page__date">{formatDateTime(notification.created_at)}</div>
              </div>
            </button>
          ))}
        </div>
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
