import { Link } from 'react-router-dom'
import sarLogo from '../../assets/logo.jpg'
import Icon from '../ui/Icon.jsx'
import A3Sheet from './A3Sheet.jsx'
import './AuthPage.css'

// Parcours d'une fiche, rappelé sur la connexion.
const JOURNEY = [
  { icon: 'file', label: 'Déclarer' },
  { icon: 'search', label: 'Analyser' },
  { icon: 'ok', label: 'Agir' },
  { icon: 'validation', label: 'Prouver' },
]

// Pages publiques (connexion, mot de passe) : la fiche A3 à gauche, le formulaire à droite.
function AuthPage({
  title,
  description,
  children,
  footer,
  pageClass = '',
  brandTitle = <>Chaque écart traité<br />sur une seule page.</>,
  brandAriaLabel,
}) {
  const isLoginPage = pageClass.split(/\s+/).includes('login-page')

  return (
    <main className={`auth-page ${pageClass}`.trim()}>
      <section aria-label="Présentation de l’application" className="auth-page__brand">
        <Link aria-label="SAR, accueil" className="auth-page__logo" to="/connexion">
          <span className="auth-page__logo-mark"><img alt="Logo SAR" src={sarLogo} /></span>
          <span className="auth-page__logo-copy">
            <strong>Fiches A3</strong>
            <span>Société Africaine de Raffinage</span>
          </span>
        </Link>
        {isLoginPage ? (
          <>
            <div className="auth-page__intro">
              <p className="auth-page__eyebrow">Amélioration continue</p>
              <h2 aria-label={brandAriaLabel}>{brandTitle}</h2>
            </div>
            <ol aria-label="Parcours d’une fiche A3" className="auth-page__journey">
              {JOURNEY.map((step, index) => (
                <li key={step.label}>
                  <span aria-hidden="true"><Icon name={step.icon} size={18} /></span>
                  <small>{String(index + 1).padStart(2, '0')}</small>
                  <strong>{step.label}</strong>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <>
            <div className="auth-page__intro">
              <p className="auth-page__eyebrow">Amélioration continue</p>
              <h2>Chaque écart traité<br />sur une seule page.</h2>
              <p>Déclarez un problème, trouvez ses causes, suivez les actions et mesurez le gain.</p>
            </div>
            <A3Sheet />
          </>
        )}
      </section>
      <section className="auth-page__panel">
        <div className="auth-card">
          {isLoginPage && <span className="auth-card__badge"><Icon name="lock" size={14} />Espace sécurisé Fiches A3</span>}
          <h1>{title}</h1>
          {description && <p className="auth-card__description">{description}</p>}
          {children}
          {footer && <div className="auth-card__footer">{footer}</div>}
        </div>
        {isLoginPage && <p className="auth-page__copyright">© SAR</p>}
      </section>
    </main>
  )
}

export default AuthPage
