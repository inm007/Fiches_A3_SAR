import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout.jsx'
import Dashboard from './pages/dashboard/Dashboard.jsx'
import Fiches from './pages/fiches/Fiches.jsx'
import FicheNouvelle from './pages/fiches/FicheNouvelle.jsx'
import FicheDetail from './pages/fiches/FicheDetail.jsx'
import Validations from './pages/workflow/Validations.jsx'
import Notifications from './pages/workflow/Notifications.jsx'
import Login from './pages/auth/Login.jsx'
import Register from './pages/auth/Register.jsx'
import ForgotPassword from './pages/auth/ForgotPassword.jsx'
import ResetPassword from './pages/auth/ResetPassword.jsx'
import Technique from './pages/system/Technique.jsx'
import Forbidden from './pages/system/Forbidden.jsx'
import NotFound from './pages/system/NotFound.jsx'
import Affectations from './pages/admin/Affectations.jsx'
import Equipements from './pages/admin/Equipements.jsx'
import Listes from './pages/admin/Listes.jsx'
import ParametresFonctionnels from './pages/admin/ParametresFonctionnels.jsx'
import Unites from './pages/admin/Unites.jsx'
import Utilisateurs from './pages/admin/Utilisateurs.jsx'

const enableDevRegister = import.meta.env.VITE_ENABLE_DEV_REGISTER === 'true'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/tableau-de-bord" replace />} />
        <Route path="/connexion" element={<Login />} />
        <Route path="/inscription" element={enableDevRegister ? <Register /> : <Navigate to="/connexion" replace />} />
        <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
        <Route path="/reinitialisation/:jeton" element={<ResetPassword />} />
        <Route element={<AppLayout />}>
          <Route path="/tableau-de-bord" element={<Dashboard />} />
          <Route path="/fiches" element={<Fiches />} />
          <Route path="/fiches/nouvelle" element={<FicheNouvelle />} />
          <Route path="/fiches/:id" element={<FicheDetail />} />
          <Route path="/validations" element={<Validations />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/admin/utilisateurs" element={<Utilisateurs />} />
          <Route path="/admin/affectations" element={<Affectations />} />
          <Route path="/admin/unites" element={<Unites />} />
          <Route path="/admin/equipements" element={<Equipements />} />
          <Route path="/admin/listes" element={<Listes />} />
          <Route path="/admin/parametres-fonctionnels" element={<ParametresFonctionnels />} />
          <Route path="/technique" element={<Technique />} />
          <Route path="/403" element={<Forbidden />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
