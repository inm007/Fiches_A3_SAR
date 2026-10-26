import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import { useCounters } from '../../hooks/useCounters.js'
import sarLogo from '../../assets/logo.jpg'
import NotificationBell from './NotificationBell.jsx'
import './Header.css'

const ADMIN_LINKS = [
  ['/admin/utilisateurs', 'Utilisateurs'],
  ['/admin/affectations', 'Affectations'],
  ['/admin/circuit', 'Circuit de validation'],
  ['/admin/unites', 'Unités'],
  ['/admin/equipements', 'Équipements'],
  ['/admin/listes', 'Listes de choix'],
  ['/admin/organigramme', 'Organigramme'],
  ['/admin/droits', 'Droits des rôles'],
  ['/admin/parametres-fonctionnels', 'Paramètres'],
]

const linkClass = ({ isActive }) => `header__link${isActive ? ' is-active' : ''}`

// Ferme un menu déroulant au clic en dehors ou à la navigation.
function useMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const close = (event) => { if (!ref.current?.contains(event.target)) setOpen(false) }
    const escape = (event) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return { open, setOpen, ref }
}

function AdminMenu() {
  const { open, setOpen, ref } = useMenu()
  const { pathname } = useLocation()

  return (
    <div className="header__menu" ref={ref}>
      <button aria-expanded={open} className={`header__link${pathname.startsWith('/admin') ? ' is-active' : ''}`} type="button" onClick={() => setOpen((value) => !value)}>
        Administration ▾
      </button>
      {open && (
        <div className="header__pop">
          {ADMIN_LINKS.map(([to, label]) => <NavLink className={({ isActive }) => `header__pop-item${isActive ? ' is-active' : ''}`} key={to} to={to} onClick={() => setOpen(false)}>{label}</NavLink>)}
        </div>
      )}
    </div>
  )
}

function UserMenu() {
  const { user, profiles, activeProfile, switchProfile, logout } = useAuth()
  const navigate = useNavigate()
  const { open, setOpen, ref } = useMenu()
  const [error, setError] = useState('')

  async function choisir(profile) {
    setOpen(false)
    if (profile.affectation_id === activeProfile?.affectation_id) return
    try {
      navigate(await switchProfile(profile.affectation_id), { replace: true })
    } catch (requestError) {
      setError(requestError.message || 'Impossible de changer de profil.')
    }
  }

  async function quitter() {
    try {
      await logout()
      navigate('/connexion', { replace: true })
    } catch (requestError) {
      setError(requestError.message || 'La déconnexion a échoué.')
    }
  }

  return (
    <div className="header__menu" ref={ref}>
      <button aria-expanded={open} className="header__user" type="button" onClick={() => setOpen((value) => !value)}>
        <strong>{user?.prenom} {user?.nom}</strong>
        <span>{activeProfile?.label}</span>
      </button>
      {open && (
        <div className="header__pop header__pop--right">
          {profiles.length > 1 && (
            <>
              <div className="header__pop-title">Changer de profil</div>
              {profiles.map((profile) => (
                <button className={`header__pop-item${profile.affectation_id === activeProfile?.affectation_id ? ' is-active' : ''}`} key={profile.affectation_id} type="button" onClick={() => choisir(profile)}>
                  {profile.label}
                </button>
              ))}
              <hr />
            </>
          )}
          <button className="header__pop-item" type="button" onClick={quitter}>Se déconnecter</button>
        </div>
      )}
      {error && <span className="header__error" role="alert">{error}</span>}
    </div>
  )
}

// Barre unique de l'application : trois liens pour tout le monde, l'administration pour l'admin.
function Header() {
  const { activeProfile } = useAuth()
  const { validations } = useCounters()
  const { pathname } = useLocation()
  const role = activeProfile?.role_code
  const technique = role === 'ADMIN_TECHNIQUE'
  const peutDeclarer = activeProfile?.permissions?.includes('DECLARER_FICHE')
  const ficheDetail = /^\/fiches\/\d+/.test(pathname)

  return (
    <header className="header">
      <NavLink className="header__brand" to={activeProfile?.redirect_to || '/'}>
        <img alt="SAR" src={sarLogo} />
        <span>Fiches A3</span>
      </NavLink>
      <nav aria-label="Navigation principale" className="header__nav">
        {technique ? (
          <NavLink className={linkClass} to="/technique">État technique</NavLink>
        ) : (
          <>
            <NavLink className={linkClass} end to="/tableau-de-bord">
              À faire{validations > 0 && <b className="header__count">{validations}</b>}
            </NavLink>
            <NavLink className={({ isActive }) => `header__link${isActive || ficheDetail ? ' is-active' : ''}`} end to="/fiches">Fiches</NavLink>
            {role === 'ADMIN_FONCTIONNEL' && <AdminMenu />}
          </>
        )}
      </nav>
      <div className="header__right">
        {peutDeclarer && <NavLink className="header__new" to="/fiches/nouvelle">+ Nouvelle fiche</NavLink>}
        {!technique && <NotificationBell />}
        <UserMenu />
      </div>
    </header>
  )
}

export default Header
