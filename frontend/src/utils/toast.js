// Message de confirmation éphémère, affiché par ToastHost (3,2 s par défaut).
export function toast(message, durationMs = 3200) {
  window.dispatchEvent(new CustomEvent('sar:toast', { detail: { message, durationMs } }))
}
