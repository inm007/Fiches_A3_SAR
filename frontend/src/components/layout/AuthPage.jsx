import { Link } from 'react-router-dom'
import sarLogo from '../../assets/logo.jpg'
import A3Sheet from './A3Sheet.jsx'
import './AuthPage.css'

// Pages publiques (connexion, mot de passe) : la fiche A3 à gauche, le formulaire à droite.
function AuthPage({ title, description, children, footer, pageClass = '' }) {
  return (
    <main className={`auth-page ${pageClass}`.trim()}>
      <section aria-label="Présentation de l’application" className="auth-page__brand">
        <Link aria-label="SAR, accueil" className="auth-page__logo" to="/connexion">
          <img alt="Logo SAR" src={sarLogo} />
        </Link>
        <div className="auth-page__intro">
          <p className="auth-page__eyebrow">Société Africaine de Raffinage · Amélioration continue</p>
          <h2>Chaque écart traité<br />sur une seule page.</h2>
          <p>Déclarez un problème, trouvez ses causes, suivez les actions et mesurez le gain.</p>
        </div>
        <A3Sheet />
      </section>
      <section className="auth-page__panel">
        <div className="auth-card">
          <h1>{title}</h1>
          {description && <p className="auth-card__description">{description}</p>}
          {children}
          {footer && <div className="auth-card__footer">{footer}</div>}
        </div>
      </section>
    </main>
  )
}

export default AuthPage
