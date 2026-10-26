import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { sectionOf } from './adminSections.js'
import './AdminSection.css'

/** Onglets entre les écrans d'une même entrée d'administration, au-dessus de l'écran ouvert. */
function AdminSection() {
  const section = sectionOf(useLocation().pathname)
  return (
    <>
      {section?.pages.length > 1 && (
        <nav aria-label={section.label} className="sar-tabs admin-section__tabs">
          {section.pages.map((page) => (
            <NavLink className={({ isActive }) => (isActive ? 'is-active' : undefined)} end key={page.to} to={page.to}>{page.label}</NavLink>
          ))}
        </nav>
      )}
      <Outlet />
    </>
  )
}

export default AdminSection
