import { useEffect, useMemo, useState } from 'react'
import AuthContext, { SESSION_WARNING_DELAY } from './auth-context.js'
import { apiRequest } from './api.js'

const SESSION_IDLE_LIMIT = 30 * 60 * 1000

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [activeProfile, setActiveProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [sessionWarning, setSessionWarning] = useState(false)

  useEffect(() => {
    let mounted = true

    apiRequest('/auth/moi')
      .then((session) => {
        if (mounted) {
          window.sessionStorage.setItem('sar.session.authenticated', 'true')
          setUser(session.user)
          setProfiles(session.profils)
          setActiveProfile(session.profil_actif)
        }
      })
      .catch((error) => {
        if (error.status === 401) {
          if (window.sessionStorage.getItem('sar.session.authenticated') === 'true') {
            setSessionExpired(true)
          }
          window.sessionStorage.removeItem('sar.session.authenticated')
        } else {
          console.error('Échec de la restauration de la session SAR.', error)
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!user) return undefined

    let idleTimeout
    let warningTimeout
    const resetIdleTimeout = () => {
      window.clearTimeout(idleTimeout)
      window.clearTimeout(warningTimeout)
      setSessionWarning(false)
      warningTimeout = window.setTimeout(() => setSessionWarning(true), SESSION_IDLE_LIMIT - SESSION_WARNING_DELAY)
      idleTimeout = window.setTimeout(() => {
        setSessionWarning(false)
        setUser(null)
        setProfiles([])
        setActiveProfile(null)
        setSessionExpired(true)
      }, SESSION_IDLE_LIMIT)
    }
    const expireSession = () => {
      window.sessionStorage.removeItem('sar.session.authenticated')
      setUser(null)
      setProfiles([])
      setActiveProfile(null)
      setSessionExpired(true)
    }

    window.addEventListener('sar:api-activity', resetIdleTimeout)
    window.addEventListener('sar:session-expired', expireSession)
    resetIdleTimeout()

    return () => {
      window.clearTimeout(idleTimeout)
      window.clearTimeout(warningTimeout)
      window.removeEventListener('sar:api-activity', resetIdleTimeout)
      window.removeEventListener('sar:session-expired', expireSession)
    }
  }, [user])

  const value = useMemo(() => ({
    user,
    profiles,
    activeProfile,
    loading,
    sessionExpired,
    sessionWarning,
    // Une requête active prolonge la session côté serveur et relance les minuteurs.
    async stayConnected() {
      await apiRequest('/auth/moi')
    },
    async login(credentials) {
      const session = await apiRequest('/auth/connexion', {
        method: 'POST',
        body: JSON.stringify(credentials),
      })
      setUser(session.user)
      setProfiles(session.profils)
      setActiveProfile(session.profil_actif)
      window.sessionStorage.setItem('sar.session.authenticated', 'true')
      setSessionExpired(false)
      return session.redirect_to
    },
    async logout() {
      try {
        await apiRequest('/auth/deconnexion', { method: 'POST' })
      } catch (error) {
        if (error.status !== 401) {
          throw error
        }
      }
      window.sessionStorage.removeItem('sar.session.authenticated')
      setUser(null)
      setProfiles([])
      setActiveProfile(null)
      setSessionExpired(false)
    },
    async switchProfile(affectationId) {
      const session = await apiRequest('/auth/profil-actif', {
        method: 'POST',
        body: JSON.stringify({ affectation_id: affectationId }),
      })
      setProfiles(session.profils)
      setActiveProfile(session.profil_actif)
      return session.redirect_to
    },
  }), [activeProfile, loading, profiles, sessionExpired, sessionWarning, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
