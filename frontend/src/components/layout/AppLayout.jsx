import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import { Maintenance } from '../../pages/system/ErrorPages.jsx'
import ErrorBoundary from '../shared/ErrorBoundary.jsx'
import PageLoader from '../shared/PageLoader.jsx'
import ToastHost from '../ui/ToastHost.jsx'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'
import './AppLayout.css'

function AppLayout() {
  const { pathname } = useLocation()
  const { activeProfile } = useAuth()
  const [maintenance, setMaintenance] = useState(false)

  // Une réponse 503 de l'API remplace la page courante par l'écran de maintenance.
  useEffect(() => {
    const show = () => setMaintenance(true)
    window.addEventListener('sar:maintenance', show)
    return () => window.removeEventListener('sar:maintenance', show)
  }, [])

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-layout__workspace">
        <Topbar />
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
    </div>
  )
}

export default AppLayout
