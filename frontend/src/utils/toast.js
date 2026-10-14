// Message de confirmation éphémère, affiché par ToastHost (maquette : bas à droite, 3,2 s).
export function toast(message) {
  window.dispatchEvent(new CustomEvent('sar:toast', { detail: message }))
}
