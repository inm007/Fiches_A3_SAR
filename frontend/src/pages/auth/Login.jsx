import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import { ApiError } from '../../auth/api.js'
import Alert from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import AuthPage from '../../components/layout/AuthPage.jsx'
import './Login.css'

const eyeOpen = 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10-3a3 3 0 100 6 3 3 0 000-6z'
const eyeClosed = 'M3 3l18 18M10.6 5.1A10 10 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.2 4.2M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 005.4-1.6M9.9 9.9a3 3 0 004.2 4.2'

const brandLines = [
  'De la déclaration à la clôture,',
  'chaque fiche A3 est suivie, validée et tracée,',
  'jusqu’à la preuve des résultats.',
]

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
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [compactViewport] = useState(() => window.matchMedia('(max-width: 1023px)').matches)
  const showBrandTextImmediately = reducedMotion || compactViewport
  const [typedLines, setTypedLines] = useState(() => (
    showBrandTextImmediately ? brandLines : brandLines.map(() => '')
  ))
  const [activeBrandLine, setActiveBrandLine] = useState(() => (
    showBrandTextImmediately ? brandLines.length - 1 : 0
  ))
  const [typingComplete, setTypingComplete] = useState(showBrandTextImmediately)

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Connexion — Fiches A3'
    identifierRef.current?.focus({ preventScroll: true })
    return () => {
      document.title = previousTitle
    }
  }, [])

  useEffect(() => {
    if (showBrandTextImmediately) return undefined

    let lineIndex = 0
    let characterIndex = 0
    let cancelled = false
    const timers = new Set()

    function schedule(callback, delay) {
      const timer = window.setTimeout(() => {
        timers.delete(timer)
        if (!cancelled) callback()
      }, delay)
      timers.add(timer)
    }

    function typeCharacter() {
      const line = brandLines[lineIndex]
      characterIndex += 1
      setTypedLines((previous) => previous.map((text, index) => (
        index === lineIndex ? line.slice(0, characterIndex) : text
      )))

      if (characterIndex < line.length) {
        schedule(typeCharacter, 45)
      } else if (lineIndex < brandLines.length - 1) {
        schedule(() => {
          lineIndex += 1
          characterIndex = 0
          setActiveBrandLine(lineIndex)
          typeCharacter()
        }, 600)
      } else {
        setTypingComplete(true)
      }
    }

    schedule(typeCharacter, 45)
    return () => {
      cancelled = true
      timers.forEach((timer) => window.clearTimeout(timer))
      timers.clear()
    }
  }, [showBrandTextImmediately])

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
      brandAriaLabel={brandLines.join(' ')}
      brandTitle={(
        <>
          <span aria-hidden="true" className="login-page__typewriter">
            {brandLines.map((line, index) => (
              <span
                className={`login-page__typewriter-line${(typingComplete && index === brandLines.length - 1) || (!typingComplete && index === activeBrandLine) ? ' has-cursor' : ''}${index === brandLines.length - 1 ? ' is-highlighted' : ''}`}
                key={line}
              >
                {typedLines[index]}
              </span>
            ))}
          </span>
          <span aria-hidden="true" className="login-page__mobile-slogan">Jusqu’à la preuve des résultats.</span>
        </>
      )}
      footer="Accès créé par votre administrateur."
      pageClass={`login-page${invalid ? ' has-error' : ''}`}
      title="Connexion"
    >
      {(errorMessage || expired) && (
        <div
          aria-atomic="true"
          aria-live={errorMessage ? 'assertive' : 'polite'}
          className="login-page__message"
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
          <div className="auth-field__control login-page__input-control">
            <svg aria-hidden="true" className="sar-icon" height="18" viewBox="0 0 24 24" width="18">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0116 0" />
            </svg>
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
          <div className="auth-field__control login-page__input-control">
            <svg aria-hidden="true" className="sar-icon" height="18" viewBox="0 0 24 24" width="18">
              <rect height="11" rx="2" width="16" x="4" y="10" />
              <path d="M8 10V7a4 4 0 118 0v3" />
            </svg>
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
              <svg aria-hidden="true" className="sar-icon" height="18" viewBox="0 0 24 24" width="18"><path d={showPassword ? eyeClosed : eyeOpen} /></svg>
            </button>
          </div>
        </div>
        <Button
          className={submitting ? 'is-loading' : ''}
          disabled={submitting || locked || !identifiant.trim() || !password}
          type="submit"
        >
          {submitting && <span aria-hidden="true" className="login-page__spinner" />}
          {submitting ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>
    </AuthPage>
  )
}

export default Login
