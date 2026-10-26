// Libellé du dernier élément du fil d'Ariane (ex. « A3-2026-014 ») fourni par la page affichée.
export function setCrumb(label) {
  window.dispatchEvent(new CustomEvent('sar:crumb', { detail: label }))
}
