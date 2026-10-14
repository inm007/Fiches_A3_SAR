import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import { useCounters } from '../../hooks/useCounters.js'
import sarLogo from '../../assets/logo.jpg'
import { BUSINESS_ROLES, DECIDING_ROLES } from '../../utils/constants.js'
import './Sidebar.css'

const sharedRoles = BUSINESS_ROLES
const validationRoles = DECIDING_ROLES
const allBusinessRoles = [...sharedRoles]

const iconPaths = {
  dashboard: 'M3 10.5 12 3l9 7.5M5 9v11h14V9M9 20v-6h6v6',
  files: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7',
  add: 'M12 5v14M5 12h14',
  validation: 'M5 12l4 4L19 6M4 4h5M4 20h5',
  bell: 'M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  users: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  assignments: 'M9 5h6M9 3h6v4H9zM6 5H4v16h16V5h-2M8 12h8M8 16h6',
  unit: 'M3 21h18M5 21V5l7-3 7 3v16M9 9h1M14 9h1M9 13h1M14 13h1M10 21v-4h4v4',
  equipment: 'M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a5 5 0 0 0 6.4-6.4l-3 3-3-3zM18 3l3 3-3 3',
  lists: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 2.94-.09-.02a1.7 1.7 0 0 0-1.72.75l-.05.08h-3.4l-.04-.09a1.7 1.7 0 0 0-1.52-1.02h-.1l-1.7-2.94.06-.07a1.7 1.7 0 0 0 .35-1.67l-.03-.1-2.94-1.7.02-.09a1.7 1.7 0 0 0-.75-1.72l-.08-.05V7.9l.09-.04a1.7 1.7 0 0 0 1.02-1.52v-.1l2.94-1.7.07.06a1.7 1.7 0 0 0 1.67.35l.1-.03 1.7-2.94.09.02a1.7 1.7 0 0 0 1.72-.75l.05-.08h3.4l.04.09a1.7 1.7 0 0 0 1.52 1.02h.1l1.7 2.94-.06.07a1.7 1.7 0 0 0-.35 1.67l.03.1 2.94 1.7-.02.09a1.7 1.7 0 0 0 .75 1.72l.08.05v3.4l-.09.04a1.7 1.7 0 0 0-1.02 1.52v.1z',
  technical: 'M12 8v4l3 2M4.93 4.93a10 10 0 1 0 14.14 0 10 10 0 0 0-14.14 0',
}

const menuLinks = [
  { label: 'Tableau de bord', to: '/tableau-de-bord', icon: 'dashboard', roles: sharedRoles },
  { label: 'Fiches', to: '/fiches', icon: 'files', roles: allBusinessRoles },
  { label: 'Nouvelle fiche', to: '/fiches/nouvelle', icon: 'add', roles: ['AGENT', 'PILOTE'] },
  { label: 'Validations à traiter', to: '/validations', icon: 'validation', roles: validationRoles },
  { label: 'Notifications', to: '/notifications', icon: 'bell', roles: sharedRoles },
]

const adminLinks = [
  { label: 'Utilisateurs', to: '/admin/utilisateurs', icon: 'users' },
  { label: 'Affectations', to: '/admin/affectations', icon: 'assignments' },
  { label: 'Unités', to: '/admin/unites', icon: 'unit' },
  { label: 'Équipements', to: '/admin/equipements', icon: 'equipment' },
  { label: 'Listes de choix', to: '/admin/listes', icon: 'lists' },
  { label: 'Paramètres fonctionnels', to: '/admin/parametres-fonctionnels', icon: 'settings' },
]

function SidebarIcon({ name }) {
  return (
    <svg aria-hidden="true" className="sidebar__icon" fill="none" viewBox="0 0 24 24">
      <path d={iconPaths[name]} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  )
}

function SidebarLink({ label, to, icon, count = 0, active }) {
  return (
    <NavLink end className={({ isActive }) => `sidebar__link${(active ?? isActive) ? ' is-active' : ''}`} to={to}>
      <SidebarIcon name={icon} />
      <span>{label}</span>
      {count > 0 && <b className="sidebar__count" aria-label={`${count} en attente`}>{count}</b>}
    </NavLink>
  )
}

function Sidebar() {
  const { activeProfile, user } = useAuth()
  const roleCode = activeProfile?.role_code
  const homeRoute = activeProfile?.redirect_to || '/tableau-de-bord'
  const visibleLinks = menuLinks.filter(({ roles }) => roles.includes(roleCode))
  const initials = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toLocaleUpperCase()
  const counters = useCounters()
  const { pathname } = useLocation()
  // Le détail d'une fiche reste rattaché à l'entrée « Fiches » (fil d'Ariane de la maquette).
  const ficheDetail = /^\/fiches\/\d+/.test(pathname)
  const counts = { '/validations': counters.validations, '/notifications': counters.notifications }

  return (
    <aside className="sidebar">
      <NavLink className="sidebar__brand" to={homeRoute}>
        <img alt="SAR" className="sidebar__logo" src={sarLogo} />
        <span className="sidebar__brand-copy">
          <strong>Fiches A3</strong>
          <span>Amélioration continue</span>
        </span>
      </NavLink>
      <div className="sidebar__scroll">
        {visibleLinks.length > 0 && (
          <>
            <div className="sidebar__section-label">Espace de travail</div>
            <nav aria-label="Navigation principale" className="sidebar__nav">
              {visibleLinks.map(({ label, to, icon }) => (
                <SidebarLink active={to === '/fiches' && ficheDetail ? true : undefined} count={counts[to]} icon={icon} key={to} label={label} to={to} />
              ))}
            </nav>
          </>
        )}
        {roleCode === 'ADMIN_FONCTIONNEL' && (
          <>
            <div className="sidebar__section-label">Administration</div>
            <nav aria-label="Administration" className="sidebar__nav">
              {adminLinks.map(({ label, to, icon }) => (
                <SidebarLink icon={icon} key={to} label={label} to={to} />
              ))}
            </nav>
          </>
        )}
        {roleCode === 'ADMIN_TECHNIQUE' && (
          <>
            <div className="sidebar__section-label">Administration technique</div>
            <nav aria-label="Administration technique" className="sidebar__nav">
              <SidebarLink icon="technical" label="État technique" to="/technique" />
            </nav>
          </>
        )}
      </div>
      <div className="sidebar__account">
        <span aria-hidden="true" className="sidebar__avatar">{initials}</span>
        <span className="sidebar__account-copy">
          <strong>{user?.prenom} {user?.nom}</strong>
          <span>{activeProfile?.label || activeProfile?.role}</span>
        </span>
      </div>
    </aside>
  )
}

export default Sidebar
