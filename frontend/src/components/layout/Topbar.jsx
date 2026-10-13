import { Link, useLocation } from 'react-router-dom'
import NotificationBell from './NotificationBell.jsx'
import ProfileSwitcher from './ProfileSwitcher.jsx'
import './Topbar.css'

const routeNames = {
  '/tableau-de-bord': 'Tableau de bord',
  '/fiches': 'Fiches',
  '/fiches/nouvelle': 'Nouvelle fiche',
  '/validations': 'Validations à traiter',
  '/notifications': 'Notifications',
  '/admin/utilisateurs': 'Utilisateurs',
  '/admin/affectations': 'Affectations',
  '/admin/unites': 'Unités',
  '/admin/equipements': 'Équipements',
  '/admin/listes': 'Listes de choix',
  '/admin/parametres-fonctionnels': 'Paramètres fonctionnels',
  '/technique': 'État technique',
}

function Topbar() {
  const { pathname } = useLocation()
  const title = routeNames[pathname] || (pathname.startsWith('/fiches/') ? 'Détail de la fiche' : 'SAR')

  return (
    <header className="topbar">
      <div className="topbar__breadcrumb">
        <Link to="/tableau-de-bord">Accueil</Link>
        <span aria-hidden="true">/</span>
        <strong>{title}</strong>
      </div>
      <div className="topbar__profile">
        <ProfileSwitcher />
        <NotificationBell />
        <span className="topbar__avatar" aria-hidden="true">—</span>
      </div>
    </header>
  )
}

export default Topbar
