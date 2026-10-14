import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import { ApiError } from '../../auth/api.js'
import Alert from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import AuthPage from '../../components/layout/AuthPage.jsx'
import './Login.css'

const eyeOpen = 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10-3a3 3 0 100 6 3 3 0 000-6z'
const eyeClosed = 'M3 3l18 18M10.6 5.1A10 10 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.2 4.2M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 005.4-1.6M9.9 9.9a3 3 0 004.2 4.2'

function Login() {
  const { login, user, activeProfile, sessionExpired } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [identifiant, setIdentifiant] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [retrySeconds, setRetrySeconds] = useState(0)

  useEffect(() => {
    if (user) navigate(activeProfile?.redirect_to || '/tableau-de-bord', { replace: true })
  }, [activeProfile, navigate, user])

  useEffect(() => {
    if (retrySeconds <= 0) return undefined
    const timer = window.setTimeout(() => setRetrySeconds((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [retrySeconds])

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setSubmitting(true)

    try {
      const redirectTo = await login({ identifiant, password })
      navigate(redirectTo, { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        setRetrySeconds(Number(error.data?.retry_after || 60))
        setErrorMessage('Trop de tentatives.')
      } else if (error instanceof ApiError && error.status === 401) {
        setErrorMessage('Identifiant ou mot de passe incorrect.')
      } else {
        setErrorMessage(error.message || 'La connexion est momentanément indisponible.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const expired = location.state?.sessionExpired || sessionExpired
  const minutes = Math.ceil(retrySeconds / 60)
  const locked = retrySeconds > 0
  const invalid = Boolean(errorMessage) && !locked

  return (
    <AuthPage
      description="Utilisez l’identifiant fourni par votre administrateur."
      footer={(
        <>
          Pas encore de compte ? Les accès sont créés par l’administrateur fonctionnel de la SAR.
          <br />
          Déconnexion automatique après 30 minutes d’inactivité.
        </>
      )}
      pageClass="login-page"
      title="Connexion"
    >
      {expired && !errorMessage && <Alert severity="info">Votre session a expiré. Reconnectez-vous.</Alert>}
      {errorMessage && (
        <Alert severity={locked ? 'warning' : 'error'}>
          {errorMessage}
          {locked && ` Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`}
        </Alert>
      )}
      <form className="auth-form" noValidate onSubmit={handleSubmit}>
        <label className="auth-field" htmlFor="identifiant">
          <span className="auth-field__label">Identifiant</span>
          <input
            aria-invalid={invalid}
            autoCapitalize="none"
            autoComplete="username"
            autoFocus
            id="identifiant"
            name="identifiant"
            placeholder="prenom.nom"
            required
            spellCheck="false"
            value={identifiant}
            onChange={(event) => setIdentifiant(event.target.value)}
          />
        </label>
        <div className="auth-field">
          <span className="auth-field__label">
            <label htmlFor="mot-de-passe">Mot de passe</label>
            <Link to="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
          </span>
          <div className="auth-field__control">
            <input
              aria-invalid={invalid}
              autoComplete="current-password"
              className="has-toggle"
              id="mot-de-passe"
              name="password"
              required
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              aria-pressed={showPassword}
              className="auth-field__toggle"
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
            >
              <svg aria-hidden="true" className="sar-icon" height="18" viewBox="0 0 24 24" width="18"><path d={showPassword ? eyeClosed : eyeOpen} /></svg>
            </button>
          </div>
        </div>
        <Button disabled={submitting || locked || !identifiant.trim() || !password} type="submit">
          {submitting ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>
    </AuthPage>
  )
}

export default Login
