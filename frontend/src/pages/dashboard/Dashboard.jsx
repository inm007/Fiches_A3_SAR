import { useEffect, useState } from 'react'
import { apiRequest } from '../../auth/api.js'
import { useAuth } from '../../auth/useAuth.js'
import Alert from '../../components/ui/Alert.jsx'
import { dashboardKind, firstName, greeting } from './dashboardData.js'
import {
  AdminDashboard, AgentDashboard, ControleDashboard, DirectionDashboard, PiloteDashboard, ValideurDashboard,
} from './RoleDashboards.jsx'
import './Dashboard.css'

const LAYOUTS = {
  AGENT: AgentDashboard,
  PILOTE: PiloteDashboard,
  VALIDEUR: ValideurDashboard,
  CONTROLE_GESTION: ControleDashboard,
  DIRECTION: DirectionDashboard,
  ADMIN_FONCTIONNEL: AdminDashboard,
}

function Dashboard() {
  const { activeProfile, user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [annee, setAnnee] = useState(null)
  const roleCode = activeProfile?.role_code
  const Layout = LAYOUTS[dashboardKind(roleCode)]
  const name = firstName(user)
  const hello = `${greeting()}${name ? ` ${name}` : ''}`

  // Les indicateurs annuels (clôture, gains validés) suivent l'année choisie, l'année en cours par défaut.
  useEffect(() => {
    apiRequest(`/tableau-de-bord${annee ? `?annee=${annee}` : ''}`).then((result) => setData(result.data)).catch((loadError) => setError(loadError.message))
  }, [roleCode, annee])

  return (
    <section className={`dashboard-page dashboard-page--${dashboardKind(roleCode).toLowerCase()}`}>
      {error && <Alert severity="error">{error}</Alert>}
      <Layout data={data} hello={hello} roleLabel={activeProfile?.label?.split(' — ')[0]} onAnneeChange={setAnnee} />
    </section>
  )
}

export default Dashboard
