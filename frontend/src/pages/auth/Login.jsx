import { Link } from 'react-router-dom'
import AuthPage from '../../components/layout/AuthPage.jsx'
import Button from '../../components/common/Button.jsx'
import FormField from '../../components/common/FormField.jsx'
import './Login.css'

function Login() {
  return (
    <AuthPage pageClass="login-page" title="Connexion" description="Connectez-vous à votre espace SAR.">
      <form className="auth-form">
        <FormField autoComplete="username" id="identifiant" label="Identifiant" name="identifiant" />
        <FormField autoComplete="current-password" id="mot-de-passe" label="Mot de passe" name="password" type="password" />
        <Link to="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
        <Button type="button">Se connecter</Button>
      </form>
    </AuthPage>
  )
}

export default Login
