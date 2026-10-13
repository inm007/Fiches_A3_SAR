import { Link } from 'react-router-dom'
import './NotificationBell.css'

function NotificationBell() {
  return <Link aria-label="Notifications" className="notification-bell" to="/notifications">Notifications</Link>
}

export default NotificationBell
