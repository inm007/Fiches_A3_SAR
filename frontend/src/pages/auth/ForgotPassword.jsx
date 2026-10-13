import AuthPage from '../../components/layout/AuthPage.jsx'
import FormField from '../../components/common/FormField.jsx'
import Button from '../../components/common/Button.jsx'
import './ForgotPassword.css'

function ForgotPassword() {
  return (
    <AuthPage pageClass="forgot-password-page" title="Mot de passe oublié" description="Demandez un lien de réinitialisation.">
      <form className="auth-form">
        <FormField autoComplete="username" id="compte" label="Identifiant ou courriel" name="account" />
        <Button type="button">Envoyer la demande</Button>
      </form>
    </AuthPage>
  )
}

export default ForgotPassword
