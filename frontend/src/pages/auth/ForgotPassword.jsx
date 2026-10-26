import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../auth/api.js'
import AuthPage from '../../components/layout/AuthPage.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import FormField from '../../components/ui/FormField.jsx'

function ForgotPassword() {
  const [account, setAccount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [notice, setNotice] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setFieldError('')
    setNotice('')
    try {
      const result = await apiRequest('/auth/mot-de-passe-oublie', {
        method: 'POST',
        body: JSON.stringify({ account }),
      })
      setNotice(result.message)
    } catch (requestError) {
      // Erreur sur le champ sous le champ, sinon message général
      const accountError = requestError.data?.errors?.account?.[0]
      if (accountError) setFieldError(accountError)
      else setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthPage
      description="Saisissez votre identifiant ou votre courriel : un lien de réinitialisation vous sera envoyé."
      footer={<Link to="/connexion">Retour à la connexion</Link>}
      pageClass="forgot-password-page login-page"
      title="Mot de passe oublié"
    >
      {notice && <Alert severity="success">{notice}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      <form className="auth-form" onSubmit={handleSubmit}>
        <FormField
          autoComplete="username"
          error={fieldError}
          id="compte"
          label="Identifiant ou courriel"
          name="account"
          onChange={(event) => setAccount(event.target.value)}
          required
          value={account}
        />
        <Button loading={submitting} loadingLabel="Envoi…" type="submit">Envoyer la demande</Button>
      </form>
    </AuthPage>
  )
}

export default ForgotPassword
