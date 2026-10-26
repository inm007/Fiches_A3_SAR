import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import { ApiError } from '../../auth/api.js'
import Alert from '../../components/ui/Alert.jsx'
import AuthPage from '../../components/layout/AuthPage.jsx'
import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'

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
  const identifierRef = useRef(null)
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Connexion — Fiches A3'
    identifierRef.current?.focus({ preventScroll: true })
    return () => {
      document.title = previousTitle
    }
  }, [])

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
  const fieldDescription = invalid ? 'login-error' : undefined

  return (
    <AuthPage
      footer="Accès créé par votre administrateur."
      pageClass={`login-page${invalid ? ' has-error' : ''}`}
      title="Connexion"
    >
      {(errorMessage || expired) && (
        <div
          aria-atomic="true"
          aria-live={errorMessage ? 'assertive' : 'polite'}
          id="login-error"
        >
          {errorMessage ? (
            <Alert severity={locked ? 'warning' : 'error'}>
              {errorMessage}
              {locked && ` Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`}
            </Alert>
          ) : (
            <Alert severity="info">Votre session a expiré. Reconnectez-vous.</Alert>
          )}
        </div>
      )}
      <form className="auth-form" noValidate onSubmit={handleSubmit}>
        <div className="auth-field">
          <label className="auth-field__label" htmlFor="identifiant">Identifiant</label>
          <div className="auth-field__control">
            <input
              aria-describedby={fieldDescription}
              aria-invalid={invalid || undefined}
              autoCapitalize="none"
              autoComplete="username"
              id="identifiant"
              name="identifiant"
              placeholder="Ex. prenom.nom"
              required
              ref={identifierRef}
              spellCheck="false"
              value={identifiant}
              onChange={(event) => setIdentifiant(event.target.value)}
            />
          </div>
        </div>
        <div className="auth-field">
          <div className="auth-field__label">
            <label htmlFor="mot-de-passe">Mot de passe</label>
            <Link to="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
          </div>
          <div className="auth-field__control">
            <input
              aria-describedby={fieldDescription}
              aria-invalid={invalid || undefined}
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
              <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
            </button>
          </div>
        </div>
        <Button
          disabled={locked || !identifiant.trim() || !password}
          loading={submitting}
          loadingLabel="Connexion…"
          type="submit"
        >
          Se connecter
        </Button>
      </form>
    </AuthPage>
  )
}

export default Login
