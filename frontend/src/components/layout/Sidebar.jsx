import { NavLink } from 'react-router-dom'
import './Sidebar.css'

const primaryLinks = [
  ['Tableau de bord', '/tableau-de-bord'],
  ['Fiches', '/fiches'],
  ['Nouvelle fiche', '/fiches/nouvelle'],
  ['Validations à traiter', '/validations'],
  ['Notifications', '/notifications'],
]

const adminLinks = [
  ['Utilisateurs', '/admin/utilisateurs'],
  ['Affectations', '/admin/affectations'],
  ['Unités', '/admin/unites'],
  ['Équipements', '/admin/equipements'],
  ['Listes de choix', '/admin/listes'],
  ['Paramètres fonctionnels', '/admin/parametres-fonctionnels'],
]

function Sidebar() {
  return (
    <aside className="sidebar">
      <NavLink className="sidebar__brand" to="/tableau-de-bord">
        <span className="sidebar__logo">sar</span>
        <span>Fiche A3</span>
      </NavLink>
      <nav aria-label="Navigation principale" className="sidebar__nav">
        {primaryLinks.map(([label, to]) => (
          <NavLink end className={({ isActive }) => `sidebar__link${isActive ? ' is-active' : ''}`} key={to} to={to}>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar__section-label">Administration</div>
      <nav aria-label="Administration" className="sidebar__nav">
        {adminLinks.map(([label, to]) => (
          <NavLink end className={({ isActive }) => `sidebar__link${isActive ? ' is-active' : ''}`} key={to} to={to}>
            {label}
          </NavLink>
        ))}
        <NavLink end className={({ isActive }) => `sidebar__link${isActive ? ' is-active' : ''}`} to="/technique">
          État technique
        </NavLink>
      </nav>
    </aside>
  )
}

export default Sidebar
