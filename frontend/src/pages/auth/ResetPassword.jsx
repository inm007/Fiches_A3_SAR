import AuthPage from '../../components/layout/AuthPage.jsx'
import FormField from '../../components/common/FormField.jsx'
import Button from '../../components/common/Button.jsx'
import './ResetPassword.css'

function ResetPassword() {
  return (
    <AuthPage pageClass="reset-password-page" title="Réinitialiser le mot de passe">
      <form className="auth-form">
        <FormField autoComplete="new-password" id="nouveau-mot-de-passe" label="Nouveau mot de passe" name="password" type="password" />
        <FormField autoComplete="new-password" id="confirmation" label="Confirmer le mot de passe" name="password_confirmation" type="password" />
        <Button type="button">Réinitialiser</Button>
      </form>
    </AuthPage>
  )
}

export default ResetPassword
