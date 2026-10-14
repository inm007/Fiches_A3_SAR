import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth.js'

function ProtectedLayout() {
  const { user, loading, sessionExpired } = useAuth()
  const location = useLocation()

  if (loading) return <main aria-busy="true" className="auth-loading">Chargement de votre session…</main>
  if (!user) {
    return (
      <Navigate
        replace
        state={{ from: location, sessionExpired }}
        to="/connexion"
      />
    )
  }

  return <Outlet />
}

export function HomeRedirect() {
  const { user, activeProfile, loading } = useAuth()

  if (loading) return <main aria-busy="true" className="auth-loading">Chargement de votre session…</main>
  if (!user) return <Navigate replace to="/connexion" />

  return <Navigate replace to={activeProfile?.redirect_to || '/tableau-de-bord'} />
}

export function RequireRole({ roleCode, roleCodes }) {
  const { activeProfile, loading } = useAuth()

  if (loading) return <main aria-busy="true" className="auth-loading">Chargement de votre session…</main>
  const allowedRoles = roleCodes || (roleCode ? [roleCode] : [])
  if (!allowedRoles.includes(activeProfile?.role_code)) return <Navigate replace to="/403" />

  return <Outlet />
}

export default ProtectedLayout
