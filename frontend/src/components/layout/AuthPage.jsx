import { Link } from 'react-router-dom'
import sarLogo from '../../assets/logo.jpg'
import './AuthPage.css'

// Pages publiques (connexion, mot de passe) : une carte blanche posée sur une fiche A3
// esquissée et floutée, qui rappelle ce que fait l'application sans détourner du formulaire.
function AuthPage({ title, description, children, footer, pageClass = '' }) {
  return (
    <main className={`auth-page ${pageClass}`.trim()}>
      <div aria-hidden="true" className="auth-page__decor">
        <div className="auth-sheet">
          <div className="auth-sheet__head">
            <span>FICHE A3</span>
            <i />
          </div>
          <div className="auth-sheet__grid">
            {Array.from({ length: 6 }, (_, index) => (
              <div className="auth-sheet__block" key={index}>
                <i /><i /><i /><i />
              </div>
            ))}
          </div>
        </div>
      </div>
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
