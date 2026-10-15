import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { apiRequest } from '../../auth/api.js'
import AuthPage from '../../components/layout/AuthPage.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import FormField from '../../components/ui/FormField.jsx'
import './ResetPassword.css'

function ResetPassword() {
  const { jeton } = useParams()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') || ''
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [complete, setComplete] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setFieldErrors({})
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
      // Erreurs des deux champs sous les champs ; celles du lien (jeton, courriel) en tête
      const { password: passwordErrors, password_confirmation: confirmationErrors, ...linkErrors } = requestError.data?.errors ?? {}
      setFieldErrors({ password: passwordErrors, password_confirmation: confirmationErrors })
      const others = Object.values(linkErrors).flat()
      if (others.length) setError(others.join(' '))
      else if (!requestError.data?.errors) setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthPage pageClass="reset-password-page" title="Réinitialiser le mot de passe">
      {complete ? (
        <div className="reset-password-page__done">
          <Alert severity="success">Votre mot de passe a été défini.</Alert>
          <Link className="sar-button sar-button--primary" to="/connexion">Se connecter</Link>
        </div>
      ) : (
        <>
          {error && <Alert severity="error">{error}</Alert>}
          {(!email || !jeton) && <Alert severity="error">Le lien est incomplet ou invalide. <Link to="/mot-de-passe-oublie">Demandez un nouveau lien.</Link></Alert>}
          <form className="auth-form" onSubmit={handleSubmit}>
            <FormField autoComplete="new-password" error={fieldErrors.password} id="nouveau-mot-de-passe" hint="8 caractères minimum, dont une majuscule et un chiffre." label="Nouveau mot de passe" minLength="8" pattern="(?=.*[A-Z])(?=.*[0-9]).{8,}" title="8 caractères minimum, dont une majuscule et un chiffre" name="password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
            <FormField autoComplete="new-password" error={fieldErrors.password_confirmation} id="confirmation" label="Confirmer le mot de passe" minLength="8" name="password_confirmation" onChange={(event) => setPasswordConfirmation(event.target.value)} required type="password" value={passwordConfirmation} />
            <Button disabled={!email || !jeton} loading={submitting} loadingLabel="Réinitialisation…" type="submit">Réinitialiser</Button>
          </form>
        </>
      )}
    </AuthPage>
  )
}

export default ResetPassword
