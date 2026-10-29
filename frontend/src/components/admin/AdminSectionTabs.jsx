import { NavLink, useLocation } from 'react-router-dom'
import { sectionOf } from './adminSections.js'
import './AdminSection.css'

/** Navigation entre les écrans d'une même entrée d'administration. */
function AdminSectionTabs() {
  const section = sectionOf(useLocation().pathname)
  if (!section || section.pages.length < 2) return null

  return (
    <nav aria-label={section.label} className="sar-tabs admin-section__tabs">
      {section.pages.map((page) => (
        <NavLink className={({ isActive }) => (isActive ? 'is-active' : undefined)} end key={page.to} to={page.to}>
          {page.label}
        </NavLink>
      ))}
    </nav>
  )
}

export default AdminSectionTabs
