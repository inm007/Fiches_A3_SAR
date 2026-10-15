import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../ui/Icon.jsx'
import { refreshCounters, useCounters } from '../../hooks/useCounters.js'
import { notificationService } from '../../services/notificationService.js'
import { formatDateTime } from '../../utils/format.js'
import './NotificationBell.css'

// Cloche de la maquette : pastille du nombre de non lues, aperçu des cinq dernières.
function NotificationBell() {
  const { notifications: unread } = useCounters()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    notificationService.list(1, 5).then((result) => setItems(result.data)).catch(() => setItems([]))
    const close = (event) => { if (!ref.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  async function openNotification(notification) {
    setOpen(false)
    if (!notification.lu) {
      await notificationService.markRead(notification.id).catch(() => null)
      refreshCounters()
    }
    if (notification.fiche) navigate(`/fiches/${notification.fiche.id}`)
  }

  return (
    <div className="notification-bell" ref={ref}>
      <button aria-expanded={open} aria-label={`Notifications${unread ? ` (${unread} non lues)` : ''}`} className="notification-bell__button" type="button" onClick={() => setOpen((value) => !value)}>
        <Icon name="bell" />
        {unread > 0 && <span className="notification-bell__dot">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className="notification-bell__pop">
          <div className="notification-bell__title">Notifications</div>
          {items === null && <div className="notification-bell__empty">Chargement…</div>}
          {items?.length === 0 && <div className="notification-bell__empty">Aucune notification.</div>}
          {items?.map((notification) => (
            <button className={`notification-bell__item${notification.lu ? '' : ' is-unread'}`} key={notification.id} type="button" onClick={() => openNotification(notification)}>
              <span>{notification.message}</span>
              <span className="sar-muted">{formatDateTime(notification.created_at)}</span>
            </button>
          ))}
          <Link className="notification-bell__all" to="/notifications" onClick={() => setOpen(false)}>Tout voir</Link>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
