export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

async function ensureCsrfCookie() {
  const response = await fetch('/sanctum/csrf-cookie', {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new ApiError('Impossible d’initialiser la session sécurisée.', response.status, null)
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
  const response = await fetch(`/api${path}`, {
    ...fetchOptions,
    method,
    headers,
    credentials: 'include',
  })
  const data = response.status === 204 ? null : await response.json()

  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/connexion') {
      window.dispatchEvent(new Event('sar:session-expired'))
    }
    throw new ApiError(data?.message || 'Une erreur est survenue.', response.status, data)
  }

  // Une interrogation passive (compteurs toutes les 60 s) ne compte pas comme activité.
  if (!passive) window.dispatchEvent(new Event('sar:api-activity'))
  return data
}

