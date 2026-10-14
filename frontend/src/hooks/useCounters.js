import { useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { notificationService } from '../services/notificationService.js'
import { apiRequest } from '../auth/api.js'
import { DECIDING_ROLES } from '../utils/constants.js'

// Compteurs de la coque (cloche et pastilles du menu) : au chargement puis toutes les 60 s (D11).
// Un seul minuteur pour toute l'application, partagé par les composants abonnés.
const REFRESH_MS = 60_000
const listeners = new Set()
let state = { notifications: 0, validations: 0 }
let timer = null
let currentRole = null

async function refresh() {
  const [notifications, validations] = await Promise.all([
    notificationService.unreadCount().catch(() => state.notifications),
    DECIDING_ROLES.includes(currentRole)
      ? apiRequest('/validations', { passive: true }).then((result) => result.data.length).catch(() => state.validations)
      : Promise.resolve(0),
  ])
  state = { notifications, validations }
  listeners.forEach((listener) => listener(state))
}

export function refreshCounters() {
  return refresh()
}

export function useCounters() {
  const { activeProfile } = useAuth()
  const roleCode = activeProfile?.role_code
  const [counters, setCounters] = useState(state)

  useEffect(() => {
    if (!roleCode || roleCode === 'ADMIN_TECHNIQUE') return undefined
    listeners.add(setCounters)
    if (currentRole !== roleCode || timer === null) {
      currentRole = roleCode
      clearInterval(timer)
      refresh()
      timer = setInterval(refresh, REFRESH_MS)
    }
    return () => {
      listeners.delete(setCounters)
      if (listeners.size === 0) {
        clearInterval(timer)
        timer = null
      }
    }
  }, [roleCode])

  return counters
}
