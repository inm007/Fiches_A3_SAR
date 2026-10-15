import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'
import './ToastHost.css'

const icons = { success: 'ok', error: 'al', info: 'info' }

function ToastHost() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const show = (event) => {
      const id = `${Date.now()}-${Math.random()}`
      const { message, durationMs = 3200, tone = 'success' } = typeof event.detail === 'string'
        ? { message: event.detail }
        : event.detail
      setToasts((current) => [...current, { id, message, tone }])
      window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), durationMs)
    }
    window.addEventListener('sar:toast', show)
    return () => window.removeEventListener('sar:toast', show)
  }, [])

  return (
    <div aria-live="polite" className="sar-toasts">
      {toasts.map((item) => (
        <div className={`sar-toast sar-toast--${item.tone}`} key={item.id} role={item.tone === 'error' ? 'alert' : 'status'}>
          <Icon name={icons[item.tone] ?? 'ok'} />
          {item.message}
          <button aria-label="Fermer" className="sar-toast__close" type="button" onClick={() => setToasts((current) => current.filter((toastItem) => toastItem.id !== item.id))}>
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

export default ToastHost
