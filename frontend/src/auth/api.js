export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

// Messages compréhensibles quand le serveur ne renvoie pas de message métier.
const STATUS_MESSAGES = {
  0: 'Impossible de joindre le serveur. Vérifiez votre connexion réseau puis réessayez.',
  419: 'Votre session a expiré. Rechargez la page puis reconnectez-vous si nécessaire.',
  429: 'Trop de requêtes en peu de temps. Patientez quelques secondes puis réessayez.',
  500: 'Le serveur a rencontré une erreur. Réessayez ; si le problème persiste, contactez l’administrateur.',
  502: 'Le serveur est momentanément injoignable. Réessayez dans quelques instants.',
  503: 'L’application est momentanément indisponible (maintenance). Réessayez dans quelques minutes.',
  504: 'Le serveur met trop de temps à répondre. Réessayez dans quelques instants.',
}

// Messages techniques par défaut de Laravel, s'ils arrivent en anglais (locale du serveur non française).
const LARAVEL_DEFAULTS = {
  'Unauthenticated.': 'Votre session a expiré. Reconnectez-vous.',
  'This action is unauthorized.': 'Vous n’êtes pas autorisé à effectuer cette action.',
  'Not Found': 'Élément introuvable.',
  'Forbidden': 'Accès refusé.',
  'Too Many Attempts.': STATUS_MESSAGES[429],
  'Too Many Requests': STATUS_MESSAGES[429],
  'CSRF token mismatch.': STATUS_MESSAGES[419],
  'Server Error': STATUS_MESSAGES[500],
}

// Message affiché pour une erreur API : le message métier de Laravel (validation, droits)
// est conservé ; les erreurs techniques reçoivent un texte en français.
export function apiErrorMessage(status, data, fallback = 'Une erreur est survenue.') {
  if (STATUS_MESSAGES[status] && (status === 0 || status >= 500 || status === 419 || !data?.message)) {
    return STATUS_MESSAGES[status]
  }
  return LARAVEL_DEFAULTS[data?.message] ?? (data?.message || fallback)
}

async function readJson(response) {
  if (response.status === 204) return null
  return response.json().catch(() => null)
}

async function send(url, options) {
  try {
    return await fetch(url, options)
  } catch {
    throw new ApiError(STATUS_MESSAGES[0], 0, null)
  }
}

function signalServerState(status) {
  if (status === 503) window.dispatchEvent(new Event('sar:maintenance'))
}

async function ensureCsrfCookie() {
  const response = await send('/sanctum/csrf-cookie', {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    signalServerState(response.status)
    throw new ApiError(apiErrorMessage(response.status, null, 'Impossible d’initialiser la session sécurisée.'), response.status, null)
  }
}

function csrfToken() {
  const tokenCookie = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('XSRF-TOKEN='))

  return tokenCookie ? decodeURIComponent(tokenCookie.slice('XSRF-TOKEN='.length)) : null
}

export async function apiRequest(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    await ensureCsrfCookie()
  }

  const headers = new Headers(options.headers || {})
  headers.set('Accept', 'application/json')

  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const token = csrfToken()
  if (token && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers.set('X-XSRF-TOKEN', token)
  }

  const { passive = false, ...fetchOptions } = options
  const response = await send(`/api${path}`, {
    ...fetchOptions,
    method,
    headers,
    credentials: 'include',
  })
  const data = await readJson(response)

  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/connexion') {
      window.dispatchEvent(new Event('sar:session-expired'))
    }
    signalServerState(response.status)
    throw new ApiError(apiErrorMessage(response.status, data), response.status, data)
  }

  // Une interrogation passive (compteurs toutes les 60 s) ne compte pas comme activité.
  if (!passive) window.dispatchEvent(new Event('sar:api-activity'))
  return data
}

export async function apiDownload(path) {
  const response = await send(`/api${path}`, {
    credentials: 'include',
    headers: { Accept: 'application/octet-stream, application/json' },
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    if (response.status === 401) {
      window.dispatchEvent(new Event('sar:session-expired'))
    }
    signalServerState(response.status)
    throw new ApiError(apiErrorMessage(response.status, data, 'Le téléchargement a échoué.'), response.status, data)
  }

  window.dispatchEvent(new Event('sar:api-activity'))
  return response.blob()
}
