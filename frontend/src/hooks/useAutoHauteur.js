import { useLayoutEffect, useRef } from 'react'

/**
 * Grandit avec son texte : une ou deux lignes quand c'est court, toute la place qu'il faut sinon.
 * `rows` fixe la hauteur de départ.
 */
export function useAutoHauteur(value) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight + 2}px`
  }, [value])
  return ref
}
