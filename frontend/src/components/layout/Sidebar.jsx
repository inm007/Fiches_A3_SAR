import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import { useCounters } from '../../hooks/useCounters.js'
import Icon from '../ui/Icon.jsx'
import sarLogo from '../../assets/logo.jpg'
import { ADMIN_SECTIONS, sectionOf } from '../admin/adminSections.js'
import { BUSINESS_ROLES, DECIDING_ROLES } from '../../utils/constants.js'
import './Sidebar.css'
import { personName } from '../../utils/format.js'

const sharedRoles = BUSINESS_ROLES
const validationRoles = DECIDING_ROLES
const allBusinessRoles = [...sharedRoles]

const menuLinks = [
  { label: 'Tableau de bord', to: '/tableau-de-bord', icon: 'dashboard', roles: sharedRoles },
  { label: 'Fiches', to: '/fiches', icon: 'files', roles: allBusinessRoles },
  { label: 'Nouvelle fiche', to: '/fiches/nouvelle', icon: 'plus', roles: allBusinessRoles, permission: 'DECLARER_FICHE' },
  { label: 'Validations à traiter', to: '/validations', icon: 'validation', roles: validationRoles },
  { label: 'Leçons et standards', to: '/lecons', icon: 'bulb', roles: sharedRoles },
  { label: 'Notifications', to: '/notifications', icon: 'bell', roles: sharedRoles },
]


function SidebarLink({ label, to, icon, count = 0, active }) {
  return (
    <NavLink end className={({ isActive }) => `sidebar__link${(active ?? isActive) ? ' is-active' : ''}`} to={to}>
      <Icon className="sidebar__icon" name={icon} size={19} />
      <span>{label}</span>
      {count > 0 && <b className="sidebar__count" aria-label={`${count} en attente`}>{count}</b>}
    </NavLink>
  )
}

function Sidebar() {
  const { activeProfile, user } = useAuth()
  const roleCode = activeProfile?.role_code
  const homeRoute = activeProfile?.redirect_to || '/tableau-de-bord'
  const visibleLinks = menuLinks.filter(({ roles, permission }) => roles.includes(roleCode) && (!permission || activeProfile?.permissions?.includes(permission)))
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
              {ADMIN_SECTIONS.map((section) => (
                <SidebarLink active={sectionOf(pathname) === section} icon={section.icon} key={section.label} label={section.label} to={section.pages[0].to} />
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
          <strong>{personName(user)}</strong>
          <span title={activeProfile?.label || activeProfile?.role}>{activeProfile?.label || activeProfile?.role}</span>
        </span>
      </div>
    </aside>
  )
}

export default Sidebar
