import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { apiRequest } from '../../auth/api.js'
import AuthPage from '../../components/layout/AuthPage.jsx'
import FormField from '../../components/common/FormField.jsx'
import Button from '../../components/common/Button.jsx'
import './ResetPassword.css'

function ResetPassword() {
  const { jeton } = useParams()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') || ''
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await apiRequest('/auth/mot-de-passe', {
        method: 'POST',
        body: JSON.stringify({
          email,
          token: jeton,
          password,
          password_confirmation: passwordConfirmation,
        }),
      })
      setComplete(true)
    } catch (requestError) {
      const validationErrors = requestError.data?.errors
      setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthPage pageClass="reset-password-page" title="Réinitialiser le mot de passe">
      {complete ? (
        <div className="reset-password-page__feedback reset-password-page__feedback--success" role="status">
          <p>Votre mot de passe a été défini.</p>
          <Link to="/connexion">Se connecter</Link>
        </div>
      ) : (
        <>
          {error && <p className="reset-password-page__feedback reset-password-page__feedback--error" role="alert">{error}</p>}
          {(!email || !jeton) && <p className="reset-password-page__feedback reset-password-page__feedback--error" role="alert">Le lien est incomplet ou invalide. Demandez un nouveau lien.</p>}
          <form className="auth-form" onSubmit={handleSubmit}>
            <FormField autoComplete="new-password" id="nouveau-mot-de-passe" hint="8 caractères minimum, dont une majuscule et un chiffre." label="Nouveau mot de passe" minLength="8" pattern="(?=.*[A-Z])(?=.*[0-9]).{8,}" title="8 caractères minimum, dont une majuscule et un chiffre" name="password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
            <FormField autoComplete="new-password" id="confirmation" label="Confirmer le mot de passe" minLength="8" name="password_confirmation" onChange={(event) => setPasswordConfirmation(event.target.value)} required type="password" value={passwordConfirmation} />
            <Button disabled={submitting || !email || !jeton} type="submit">{submitting ? 'Réinitialisation…' : 'Réinitialiser'}</Button>
          </form>
        </>
      )}
    </AuthPage>
  )
}

export default ResetPassword
