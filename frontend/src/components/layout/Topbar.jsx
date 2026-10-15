import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import Icon from '../common/Icon.jsx'
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
  '/403': 'Accès refusé',
}

function Topbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { logout, activeProfile } = useAuth()
  const [logoutError, setLogoutError] = useState('')
  const [crumb, setCrumb] = useState(null)
  const [search, setSearch] = useState('')
  const ficheDetail = /^\/fiches\/\d+/.test(pathname)
  const title = routeNames[pathname] || (ficheDetail ? (crumb ?? 'Fiche') : 'SAR')
  const canSearch = activeProfile?.role_code !== 'ADMIN_TECHNIQUE'

  useEffect(() => {
    const update = (event) => setCrumb(event.detail)
    window.addEventListener('sar:crumb', update)
    return () => window.removeEventListener('sar:crumb', update)
  }, [])

  function submitSearch(event) {
    event.preventDefault()
    navigate(`/fiches?q=${encodeURIComponent(search.trim())}`)
    setSearch('')
  }

  async function handleLogout() {
    setLogoutError('')
    try {
      await logout()
      navigate('/connexion', { replace: true })
    } catch (error) {
      setLogoutError(error.message || 'La déconnexion a échoué.')
    }
  }

  return (
    <header className="topbar">
      <nav aria-label="Fil d’Ariane" className={`topbar__breadcrumb${pathname === '/tableau-de-bord' ? ' topbar__breadcrumb--dashboard' : ''}`}>
        <Link aria-label="Accueil" className="topbar__home" to={activeProfile?.redirect_to || '/tableau-de-bord'}>
          <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
            <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1V10Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
          </svg>
        </Link>
        <svg aria-hidden="true" className="topbar__crumb-separator" fill="none" viewBox="0 0 24 24">
          <path d="m9 18 6-6-6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
        </svg>
        {ficheDetail && <Link className="topbar__crumb-link" to="/fiches">Fiches</Link>}
        {ficheDetail && (
          <svg aria-hidden="true" className="topbar__crumb-separator" fill="none" viewBox="0 0 24 24">
            <path d="m9 18 6-6-6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
          </svg>
        )}
        <strong>{title}</strong>
      </nav>
      {canSearch && (
        <form className="topbar__search" role="search" onSubmit={submitSearch}>
          <Icon name="search" size={18} />
          <input aria-label="Rechercher une fiche" placeholder="Rechercher une fiche…" value={search} onChange={(event) => setSearch(event.target.value)} />
          <kbd>↵</kbd>
        </form>
      )}
      <div className="topbar__profile">
        <ProfileSwitcher />
        {activeProfile?.role_code !== 'ADMIN_TECHNIQUE' && <NotificationBell />}
        <button aria-label="Se déconnecter" className="topbar__logout" onClick={handleLogout} title="Se déconnecter" type="button">
          <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
            <path d="M10 17l5-5-5-5m5 5H3m9-9h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
          </svg>
          <span>Déconnexion</span>
        </button>
      </div>
      {logoutError && <span className="topbar__error" role="alert">{logoutError}</span>}
    </header>
  )
}

export default Topbar
