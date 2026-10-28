// Notification éphémère, affichée par ToastHost (3,2 s par défaut, 6 s pour une erreur).
// Usage : toast('Fiche enregistrée'), toast.error('Échec de l’envoi'), toast('…', { tone: 'info' }).
function emit(message, options = {}) {
  const settings = typeof options === 'number' ? { durationMs: options } : options
  const tone = settings.tone ?? 'success'
  const durationMs = settings.durationMs === undefined ? (tone === 'error' ? 6000 : 3200) : settings.durationMs
  window.dispatchEvent(new CustomEvent('sar:toast', { detail: { id: settings.id, message, durationMs, tone } }))
}

export function toast(message, options) {
  emit(message, options)
}

toast.success = (message, options = {}) => emit(message, { ...options, tone: 'success' })
toast.error = (message, options = {}) => emit(message, { ...options, tone: 'error' })
toast.info = (message, options = {}) => emit(message, { ...options, tone: 'info' })

let suivis = 0

/**
 * Action en cours, annoncée tant qu'elle dure (« Soumission du plan en cours… ») puis remplacée,
 * au même endroit, par son succès ou son échec : l'utilisateur sait toujours ce qui se passe.
 *
 * @param {string} message Ce qui est en train de se faire.
 * @param {() => Promise<any>} task
 * @param {{ succes?: string|((resultat: any) => string), echec?: string|((erreur: Error) => string) }} [messages]
 */
export async function avecSuivi(message, task, { succes = 'C’est fait', echec } = {}) {
  suivis += 1
  const id = `suivi-${suivis}`
  emit(message, { id, tone: 'progress', durationMs: null })
  try {
    const resultat = await task()
    emit(typeof succes === 'function' ? succes(resultat) : succes, { id, tone: 'success' })
    return resultat
  } catch (error) {
    const texte = typeof echec === 'function' ? echec(error) : echec
    emit(texte ?? `Échec : ${error.message}`, { id, tone: 'error' })
    throw error
  }
}
