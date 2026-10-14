import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.jsx'
import { useAuth } from './auth/useAuth.js'
import ProtectedLayout, { HomeRedirect, RequireRole } from './auth/ProtectedLayout.jsx'
import AppLayout from './components/layout/AppLayout.jsx'
import Dashboard from './pages/dashboard/Dashboard.jsx'
import Fiches from './pages/fiches/Fiches.jsx'
import FicheNouvelle from './pages/fiches/FicheNouvelle.jsx'
import FicheDetail from './pages/fiches/FicheDetail.jsx'
import Validations from './pages/workflow/Validations.jsx'
import Notifications from './pages/workflow/Notifications.jsx'
import Login from './pages/auth/Login.jsx'
import ForgotPassword from './pages/auth/ForgotPassword.jsx'
import ResetPassword from './pages/auth/ResetPassword.jsx'
import Forbidden from './pages/system/Forbidden.jsx'
import NotFound from './pages/system/NotFound.jsx'
import Affectations from './pages/admin/Affectations.jsx'
import Equipements from './pages/admin/Equipements.jsx'
import Listes from './pages/admin/Listes.jsx'
import ParametresFonctionnels from './pages/admin/ParametresFonctionnels.jsx'
import Unites from './pages/admin/Unites.jsx'
import Utilisateurs from './pages/admin/Utilisateurs.jsx'
import Technique from './pages/Technique.jsx'
import { DECIDING_ROLES } from './utils/constants.js'

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
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/connexion" element={<Login />} />
          <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
          <Route path="/reinitialisation/:jeton" element={<ResetPassword />} />
          <Route element={<ProtectedLayout />}>
            <Route element={<AppLayout />}>
              <Route path="/tableau-de-bord" element={<DashboardRoute />} />
              <Route path="/fiches" element={<Fiches />} />
              <Route element={<RequireRole roleCodes={['AGENT', 'PILOTE']} />}>
                <Route path="/fiches/nouvelle" element={<FicheNouvelle />} />
              </Route>
              <Route path="/fiches/:id" element={<FicheDetail />} />
              <Route element={<RequireRole roleCodes={DECIDING_ROLES} />}>
                <Route path="/validations" element={<Validations />} />
              </Route>
              <Route path="/notifications" element={<Notifications />} />
              <Route element={<RequireRole roleCode="ADMIN_FONCTIONNEL" />}>
                <Route path="/admin/utilisateurs" element={<Utilisateurs />} />
                <Route path="/admin/affectations" element={<Affectations />} />
                <Route path="/admin/unites" element={<Unites />} />
                <Route path="/admin/equipements" element={<Equipements />} />
                <Route path="/admin/listes" element={<Listes />} />
                <Route path="/admin/parametres-fonctionnels" element={<ParametresFonctionnels />} />
              </Route>
              <Route element={<RequireRole roleCode="ADMIN_TECHNIQUE" />}>
                <Route path="/technique" element={<Technique />} />
              </Route>
              <Route path="/403" element={<Forbidden />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
