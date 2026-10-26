import { Link } from 'react-router-dom'
import sarLogo from '../../assets/logo.jpg'
import A3Sheet from './A3Sheet.jsx'
import './AuthPage.css'

// Pages publiques (connexion, mot de passe) : une carte blanche posée sur la fiche A3 floutée,
// qui rappelle ce que fait l'application sans détourner l'attention du formulaire.
function AuthPage({ title, description, children, footer, pageClass = '' }) {
  return (
    <main className={`auth-page ${pageClass}`.trim()}>
      <div aria-hidden="true" className="auth-page__decor"><A3Sheet /></div>
      <section className="auth-card">
        <Link aria-label="SAR, accueil" className="auth-card__brand" to="/connexion">
          <img alt="" src={sarLogo} />
          <span>Société Africaine de Raffinage</span>
        </Link>
        <h1>{title}</h1>
        <p className="auth-card__description">{description ?? 'Fiche A3 numérique · Amélioration continue'}</p>
        {children}
        {footer && <p className="auth-card__footer">{footer}</p>}
      </section>
    </main>
  )
}

export default AuthPage
