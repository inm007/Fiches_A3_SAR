import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Alert from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Skeleton from '../../components/common/Skeleton.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import { refreshCounters } from '../../hooks/useCounters.js'
import { notificationService } from '../../services/notificationService.js'
import { formatDateTime } from '../../utils/format.js'
import './Notifications.css'

// Liste paginée de la maquette : pastille « Non lu », fiche liée, « Tout marquer comme lu » (UX §9.2).
function Notifications() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(() => notificationService.list(page, 20)
    .then(setResult)
    .catch((loadError) => setError(loadError.message)), [page])

  useEffect(() => { load() }, [load])

  async function open(notification) {
    if (!notification.lu) {
      await notificationService.markRead(notification.id).catch(() => null)
      refreshCounters()
    }
    if (notification.fiche) navigate(`/fiches/${notification.fiche.id}`)
    else load()
  }

  async function markAll() {
    await notificationService.markAllRead()
    refreshCounters()
    load()
  }

  const hasUnread = result?.data.some((notification) => !notification.lu)

  return (
    <section className="notifications-page">
      <header className="sar-page-head">
        <h1>Notifications</h1>
        <Button disabled={!hasUnread} type="button" variant="secondary" onClick={markAll}>Tout marquer comme lu</Button>
      </header>
      {error && <Alert severity="error">{error}</Alert>}
      {!result && !error && <Skeleton />}
      {result?.data.length === 0 && <EmptyState description="Les validations, échéances et changements d’étape de vos fiches apparaîtront ici." title="Aucune notification" />}
      {result?.data.length > 0 && (
        <div className="sar-card notifications-page__list">
          {result.data.map((notification) => (
            <button className={`sar-list-item notifications-page__item${notification.lu ? '' : ' is-unread'}`} key={notification.id} type="button" onClick={() => open(notification)}>
              <StatusBadge tone={notification.lu ? 'neutral' : 'brand'}>{notification.lu ? 'Lu' : 'Non lu'}</StatusBadge>
              <div>
                {notification.message}
                <div className="sar-muted notifications-page__date">{formatDateTime(notification.created_at)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      {result && result.meta.last_page > 1 && (
        <footer className="notifications-page__pagination">
          <Button disabled={page <= 1} type="button" variant="secondary" onClick={() => setPage(page - 1)}>Précédent</Button>
          <span>Page {result.meta.page} / {result.meta.last_page}</span>
          <Button disabled={page >= result.meta.last_page} type="button" variant="secondary" onClick={() => setPage(page + 1)}>Suivant</Button>
        </footer>
      )}
    </section>
  )
}

export default Notifications
