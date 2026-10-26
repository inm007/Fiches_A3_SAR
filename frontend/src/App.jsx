import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.jsx'
import { useAuth } from './auth/useAuth.js'
import ProtectedLayout, { HomeRedirect, RequirePermission, RequireRole } from './auth/ProtectedLayout.jsx'
import AdminSection from './components/admin/AdminSection.jsx'
import AppLayout from './components/layout/AppLayout.jsx'
import ErrorBoundary from './components/shared/ErrorBoundary.jsx'
import PageLoader from './components/shared/PageLoader.jsx'
import Login from './pages/auth/Login.jsx'
import { Forbidden, Maintenance, NotFound, ServerError, SessionExpired } from './pages/system/ErrorPages.jsx'
import { DECIDING_ROLES } from './utils/constants.js'

// Chaque page est chargée à la demande (un fichier JS par page) ; la connexion reste dans le bundle principal.
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard.jsx'))
const Fiches = lazy(() => import('./pages/fiches/Fiches.jsx'))
const FicheNouvelle = lazy(() => import('./pages/fiches/FicheNouvelle.jsx'))
const FicheDetail = lazy(() => import('./pages/fiches/FicheDetail.jsx'))
const Validations = lazy(() => import('./pages/workflow/Validations.jsx'))
const Notifications = lazy(() => import('./pages/workflow/Notifications.jsx'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword.jsx'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword.jsx'))
const Affectations = lazy(() => import('./pages/admin/Affectations.jsx'))
const CircuitValidation = lazy(() => import('./pages/admin/CircuitValidation.jsx'))
const Droits = lazy(() => import('./pages/admin/Droits.jsx'))
const Equipements = lazy(() => import('./pages/admin/Equipements.jsx'))
const Listes = lazy(() => import('./pages/admin/Listes.jsx'))
const Organigramme = lazy(() => import('./pages/admin/Organigramme.jsx'))
const ParametresFonctionnels = lazy(() => import('./pages/admin/ParametresFonctionnels.jsx'))
const Unites = lazy(() => import('./pages/admin/Unites.jsx'))
const Utilisateurs = lazy(() => import('./pages/admin/Utilisateurs.jsx'))
const Technique = lazy(() => import('./pages/Technique.jsx'))

function DashboardRoute() {
  const { activeProfile } = useAuth()
  if (activeProfile?.redirect_to === '/technique') {
    return <Navigate replace to="/technique" />
  }
  return <Dashboard />
}

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary standalone>
        <AuthProvider>
          <Suspense fallback={<PageLoader fullScreen />}>
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/connexion" element={<Login />} />
              <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
              <Route path="/reinitialisation/:jeton" element={<ResetPassword />} />
              <Route path="/session-expiree" element={<SessionExpired />} />
              <Route path="/maintenance" element={<Maintenance standalone />} />
              <Route element={<ProtectedLayout />}>
                <Route element={<AppLayout />}>
                  <Route path="/tableau-de-bord" element={<DashboardRoute />} />
                  <Route path="/fiches" element={<Fiches />} />
                  <Route element={<RequirePermission permission="DECLARER_FICHE" />}>
                    <Route path="/fiches/nouvelle" element={<FicheNouvelle />} />
                  </Route>
                  <Route path="/fiches/:id" element={<FicheDetail />} />
                  <Route element={<RequireRole roleCodes={DECIDING_ROLES} />}>
                    <Route path="/validations" element={<Validations />} />
                  </Route>
                  <Route path="/notifications" element={<Notifications />} />
                  <Route element={<RequireRole roleCode="ADMIN_FONCTIONNEL" />}>
                    <Route element={<AdminSection />}>
                      <Route path="/admin/utilisateurs" element={<Utilisateurs />} />
                      <Route path="/admin/affectations" element={<Affectations />} />
                      <Route path="/admin/droits" element={<Droits />} />
                      <Route path="/admin/organigramme" element={<Organigramme />} />
                      <Route path="/admin/circuit" element={<CircuitValidation />} />
                      <Route path="/admin/unites" element={<Unites />} />
                      <Route path="/admin/equipements" element={<Equipements />} />
                      <Route path="/admin/listes" element={<Listes />} />
                      <Route path="/admin/parametres-fonctionnels" element={<ParametresFonctionnels />} />
                    </Route>
                  </Route>
                  <Route element={<RequireRole roleCode="ADMIN_TECHNIQUE" />}>
                    <Route path="/technique" element={<Technique />} />
                  </Route>
                  <Route path="/403" element={<Forbidden />} />
                  <Route path="/500" element={<ServerError />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
