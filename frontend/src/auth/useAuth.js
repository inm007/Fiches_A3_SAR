import { useContext } from 'react'
import AuthContext from './auth-context.js'

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé à l’intérieur de AuthProvider.')
  return context
}
