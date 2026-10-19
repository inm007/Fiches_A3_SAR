import { createContext } from 'react'

const AuthContext = createContext(null)

// Avertissement 2 minutes avant l'expiration de la session (D13) : un pilote qui rédige
// longtemps sans enregistrer garde la main et ne perd pas sa saisie.
export const SESSION_WARNING_DELAY = 2 * 60 * 1000

export default AuthContext
