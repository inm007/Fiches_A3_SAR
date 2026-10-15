// Notification éphémère, affichée par ToastHost (3,2 s par défaut, 6 s pour une erreur).
// Usage : toast('Fiche enregistrée'), toast.error('Échec de l’envoi'), toast('…', { tone: 'info' }).
function emit(message, options = {}) {
  const settings = typeof options === 'number' ? { durationMs: options } : options
  const tone = settings.tone ?? 'success'
  const durationMs = settings.durationMs ?? (tone === 'error' ? 6000 : 3200)
  window.dispatchEvent(new CustomEvent('sar:toast', { detail: { message, durationMs, tone } }))
}

export function toast(message, options) {
  emit(message, options)
}

toast.success = (message, options = {}) => emit(message, { ...options, tone: 'success' })
toast.error = (message, options = {}) => emit(message, { ...options, tone: 'error' })
toast.info = (message, options = {}) => emit(message, { ...options, tone: 'info' })
