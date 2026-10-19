import { useEffect, useState } from 'react'
import { SESSION_WARNING_DELAY } from '../../auth/auth-context.js'
import { useAuth } from '../../auth/useAuth.js'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'

const formatRemaining = (ms) => {
  const seconds = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, '0')} s`
}

function Countdown() {
  const [deadline] = useState(() => Date.now() + SESSION_WARNING_DELAY)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return <strong>{formatRemaining(deadline - now)}</strong>
}

/** Fenêtre affichée 2 minutes avant la fin de la session (30 minutes d'inactivité, D13). */
function SessionWarning() {
  const { sessionWarning, stayConnected, logout } = useAuth()
  const [busy, setBusy] = useState(false)

  async function stay() {
    setBusy(true)
    try {
      await stayConnected()
    } finally {
      setBusy(false)
    }
  }

  return (
    <ConfirmDialog
      busy={busy}
      cancelLabel="Se déconnecter"
      confirmLabel="Rester connecté"
      open={sessionWarning}
      title="Votre session va expirer"
      variant="primary"
      onCancel={logout}
      onConfirm={stay}
    >
      <p>Sans activité, vous serez déconnecté dans <Countdown />. Une saisie non enregistrée serait perdue.</p>
    </ConfirmDialog>
  )
}

export default SessionWarning
