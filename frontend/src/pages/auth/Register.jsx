import AuthPage from '../../components/layout/AuthPage.jsx'
import './Register.css'

function Register() {
  return (
    <AuthPage pageClass="register-page" title="Inscription de développement" description="Page temporaire, réservée au développement.">
      <div className="auth-notice">Cette page devra être retirée avant la livraison.</div>
    </AuthPage>
  )
}

export default Register
