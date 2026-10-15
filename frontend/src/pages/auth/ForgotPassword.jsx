import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../auth/api.js'
import AuthPage from '../../components/layout/AuthPage.jsx'
import FormField from '../../components/common/FormField.jsx'
import Button from '../../components/common/Button.jsx'
import './ForgotPassword.css'

function ForgotPassword() {
  const [account, setAccount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setNotice('')
    try {
      const result = await apiRequest('/auth/mot-de-passe-oublie', {
        method: 'POST',
        body: JSON.stringify({ account }),
      })
      setNotice(result.message)
    } catch (requestError) {
      setError(requestError.data?.errors?.account?.[0] || requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthPage
      brandAriaLabel="De la déclaration à la clôture, chaque fiche A3 est suivie, validée et tracée, jusqu’à la preuve des résultats."
      brandTitle={(
        <>
          <span aria-hidden="true" className="login-page__typewriter">
            <span className="login-page__typewriter-line">De la déclaration à la clôture,</span>
            <span className="login-page__typewriter-line">chaque fiche A3 est suivie, validée et tracée,</span>
            <span className="login-page__typewriter-line is-highlighted">jusqu’à la preuve des résultats.</span>
          </span>
          <span aria-hidden="true" className="login-page__mobile-slogan">Jusqu’à la preuve des résultats.</span>
        </>
      )}
      description="Saisissez votre identifiant ou votre courriel : un lien de réinitialisation vous sera envoyé."
      footer={<Link to="/connexion">← Retour à la connexion</Link>}
      pageClass="forgot-password-page login-page"
      title="Mot de passe oublié"
    >
      {notice && <p className="auth-feedback auth-feedback--success" role="status">{notice}</p>}
      {error && <p className="auth-feedback auth-feedback--error" role="alert">{error}</p>}
      <form className="auth-form" onSubmit={handleSubmit}>
        <FormField
          autoComplete="username"
          id="compte"
          label="Identifiant ou courriel"
          name="account"
          onChange={(event) => setAccount(event.target.value)}
          required
          value={account}
        />
        <Button disabled={submitting} type="submit">{submitting ? 'Envoi…' : 'Envoyer la demande'}</Button>
      </form>
    </AuthPage>
  )
}

export default ForgotPassword
