import sarLogo from '../../assets/logo.jpg'
import './AuthPage.css'

// Pages publiques (connexion, mot de passe) : le logo et le formulaire, rien d'autre.
function AuthPage({ title, description, children, footer, pageClass = '' }) {
  return (
    <main className={`auth-page ${pageClass}`.trim()}>
      <div className="auth-card">
        <div className="auth-card__brand">
          <img alt="Logo SAR" src={sarLogo} />
          <strong>Fiches A3</strong>
        </div>
        <h1>{title}</h1>
        {description && <p className="auth-card__description">{description}</p>}
        {children}
        {footer && <div className="auth-card__footer">{footer}</div>}
      </div>
    </main>
  )
}

export default AuthPage
