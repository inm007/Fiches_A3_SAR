import { Link } from 'react-router-dom'
import './AuthPage.css'

function AuthPage({ title, description, children, pageClass = '' }) {
  return (
    <main className={`auth-page ${pageClass}`.trim()}>
      <section className="auth-card">
        <Link aria-label="SAR, accueil" className="auth-card__logo" to="/connexion">sar</Link>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
        {children}
      </section>
    </main>
  )
}

export default AuthPage
