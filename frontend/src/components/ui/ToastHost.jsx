import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'
import Spinner from './Spinner.jsx'
import './ToastHost.css'

const icons = { success: 'ok', error: 'al', info: 'info' }

function ToastHost() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const show = (event) => {
      const detail = typeof event.detail === 'string' ? { message: event.detail } : event.detail
      const { message, durationMs = 3200, tone = 'success' } = detail
      const id = detail.id ?? `${Date.now()}-${Math.random()}`
      // Une action suivie (avecSuivi) garde sa place : « en cours… » devient « fait » ou « échec ».
      setToasts((current) => (current.some((item) => item.id === id)
        ? current.map((item) => (item.id === id ? { id, message, tone } : item))
        : [...current, { id, message, tone }]))
      if (durationMs !== null) window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id || item.tone === 'progress')), durationMs)
    }
    window.addEventListener('sar:toast', show)
    return () => window.removeEventListener('sar:toast', show)
  }, [])

  return (
    <div aria-live="polite" className="sar-toasts">
      {toasts.map((item) => (
        <div className={`sar-toast sar-toast--${item.tone}`} key={item.id} aria-busy={item.tone === 'progress' || undefined} role={item.tone === 'error' ? 'alert' : 'status'}>
          {item.tone === 'progress' ? <Spinner size="sm" /> : <Icon name={icons[item.tone] ?? 'ok'} />}
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
