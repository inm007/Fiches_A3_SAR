import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import PageBanner from '../../components/shared/PageBanner.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import ListPagination from '../../components/ui/ListPagination.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { FilterSelect, ListToolbar, ResultCount, SearchField, ToolbarActions } from '../../components/shared/ListToolbar.jsx'
import { refreshCounters } from '../../hooks/useCounters.js'
import { useListFilters } from '../../hooks/useListFilters.js'
import { notificationService } from '../../services/notificationService.js'
import { formatDate, formatDateTime } from '../../utils/format.js'
import { downloadExcel } from '../../utils/listTools.js'
import './Notifications.css'

const PAGE_SIZES = [10, 25, 50, 100]
const NO_FILTERS = { q: '', etat: '' }

// Icône selon la nature du message (affichage seulement).
function iconFor(message) {
  if (/approbation|validation|valid/i.test(message)) return 'validation'
  if (/refus|rejet/i.test(message)) return 'x'
  if (/pilote/i.test(message)) return 'users'
  if (/étape/i.test(message)) return 'arrow'
  if (/retard|échéance|rappel/i.test(message)) return 'clock'
  return 'bell'
}

function dayLabel(value) {
  const date = new Date(value)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Aujourd’hui'
  if (date.toDateString() === yesterday.toDateString()) return 'Hier'
  return formatDate(value)
}

/** Regroupe les notifications de la page par jour, dans l'ordre reçu. */
function groupByDay(notifications) {
  return notifications.reduce((groups, notification) => {
    const label = dayLabel(notification.created_at)
    const last = groups[groups.length - 1]
    if (last?.label === label) last.items.push(notification)
    else groups.push({ label, items: [notification] })
    return groups
  }, [])
}

function splitMessage(notification) {
  const numero = notification.fiche?.numero_a3
  const prefix = numero ? `${numero} — ` : ''
  return prefix && notification.message.startsWith(prefix)
    ? { numero, text: notification.message.slice(prefix.length) }
    : { numero, text: notification.message }
}

function Notifications() {
  const navigate = useNavigate()
  const list = useListFilters(NO_FILTERS)
  const { page, pageSize } = list
  const { q: query, etat: readFilter } = list.filters
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
          <SearchField label="Recherche" placeholder="Message ou numéro de fiche…" value={query} onChange={list.setFilter('q')} />
          <FilterSelect label="État" options={[['non_lu', 'Non lues'], ['lu', 'Lues']]} value={readFilter} onChange={list.setFilter('etat')} />
          <ToolbarActions>
            <ResultCount count={result.meta.total} singular="notification" />
            {list.active && <Button onClick={list.reset} type="button" variant="secondary">Réinitialiser</Button>}
            <Button disabled={!result.meta.total} icon="download" loading={exporting} loadingLabel="Préparation…" type="button" variant="export" onClick={exportAll}>Exporter Excel</Button>
          </ToolbarActions>
        </ListToolbar>
      )}
      {result?.data.length === 0 && (
        <div className="sar-card">
          <EmptyState
            action={list.active && <Button type="button" variant="secondary" onClick={list.reset}>Réinitialiser les filtres</Button>}
            description={list.active ? 'Aucune notification ne correspond à ces critères.' : 'Les validations, échéances et changements d’étape de vos fiches apparaîtront ici.'}
            icon="bell"
            title="Aucune notification"
          />
        </div>
      )}
      {result?.data.length > 0 && (
        <div className="notifications-page__groups">
          {groupByDay(result.data).map((group) => (
            <section className="notifications-page__group" key={group.label}>
              <h2>{group.label}</h2>
              <ul className="notifications-page__list">
                {group.items.map((notification) => {
                  const { numero, text } = splitMessage(notification)
                  return (
                    <li key={notification.id}>
                      <button className={`notifications-page__item${notification.lu ? '' : ' is-unread'}`} type="button" onClick={() => open(notification)}>
                        <span aria-hidden="true" className="notifications-page__icon"><Icon name={iconFor(notification.message)} size={18} /></span>
                        <span className="notifications-page__body">
                          <span className="notifications-page__message">{text}</span>
                          <span className="notifications-page__meta">
                            {numero && <span className="notifications-page__numero">{numero}</span>}
                            <span className="sar-num">{formatDateTime(notification.created_at)}</span>
                          </span>
                        </span>
                        <span className={`notifications-page__state${notification.lu ? '' : ' is-unread'}`}>{notification.lu ? 'Lu' : 'Non lu'}</span>
                        <Icon className="notifications-page__chevron" name="page-next" size={16} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
      {result && result.meta.total > 0 && (
        <ListPagination
          page={result.meta.page}
          pageSize={pageSize}
          pageSizes={PAGE_SIZES}
          total={result.meta.total}
          onPageChange={list.setPage}
          onPageSizeChange={list.changePageSize}
        />
      )}
    </section>
  )
}

export default Notifications
