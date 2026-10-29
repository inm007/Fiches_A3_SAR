import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import { Maintenance } from '../../pages/system/ErrorPages.jsx'
import ErrorBoundary from '../shared/ErrorBoundary.jsx'
import PageLoader from '../shared/PageLoader.jsx'
import ToastHost from '../ui/ToastHost.jsx'
import SessionWarning from './SessionWarning.jsx'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'
import './AppLayout.css'

function AppLayout() {
  const { pathname } = useLocation()
  const { activeProfile } = useAuth()
  const [maintenance, setMaintenance] = useState(false)
  const [mobileViewport, setMobileViewport] = useState(() => window.matchMedia('(max-width: 900px)').matches)
  const [navigationState, setNavigationState] = useState({ open: false, pathname })
  const sidebarOpen = navigationState.open && navigationState.pathname === pathname

  // Une réponse 503 de l'API remplace la page courante par l'écran de maintenance.
  useEffect(() => {
    const show = () => setMaintenance(true)
    window.addEventListener('sar:maintenance', show)
    return () => window.removeEventListener('sar:maintenance', show)
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)')
    const updateViewport = (event) => {
      setMobileViewport(event.matches)
      if (!event.matches) setNavigationState((current) => ({ ...current, open: false }))
    }
    media.addEventListener('change', updateViewport)
    return () => media.removeEventListener('change', updateViewport)
  }, [])

  useEffect(() => {
    if (!sidebarOpen || !mobileViewport) return undefined

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setNavigationState((current) => ({ ...current, open: false }))
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [mobileViewport, sidebarOpen])

  function closeNavigation() {
    setNavigationState({ open: false, pathname })
  }

  function toggleNavigation() {
    setNavigationState((current) => ({
      open: !(current.open && current.pathname === pathname),
      pathname,
    }))
  }

  return (
    <div className="app-layout">
      <Sidebar mobileViewport={mobileViewport} open={sidebarOpen} onNavigate={closeNavigation} />
      {mobileViewport && sidebarOpen && (
        <button aria-label="Fermer le menu" className="app-layout__scrim" type="button" onClick={closeNavigation} />
      )}
      <div className="app-layout__workspace">
        <Topbar mobileNavOpen={sidebarOpen} onToggleNavigation={toggleNavigation} />
        <main className="app-layout__content">
          {maintenance ? <Maintenance /> : (
            <ErrorBoundary homeTo={activeProfile?.redirect_to || '/'} key={pathname}>
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          )}
        </main>
      </div>
      <ToastHost />
      <SessionWarning />
    </div>
  )
}

export default AppLayout
