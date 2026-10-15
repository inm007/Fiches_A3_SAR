import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'
import './ToastHost.css'

function ToastHost() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const show = (event) => {
      const id = `${Date.now()}-${Math.random()}`
      const { message, durationMs } = typeof event.detail === 'string'
        ? { message: event.detail, durationMs: 3200 }
        : event.detail
      setToasts((current) => [...current, { id, message }])
      window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), durationMs)
    }
    window.addEventListener('sar:toast', show)
    return () => window.removeEventListener('sar:toast', show)
  }, [])

  return (
    <div aria-live="polite" className="sar-toasts">
      {toasts.map((item) => (
        <div className="sar-toast" key={item.id} role="status"><Icon name="ok" />{item.message}</div>
      ))}
    </div>
  )
}

export default ToastHost
