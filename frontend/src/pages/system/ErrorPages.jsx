import { useAuth } from '../../auth/useAuth.js'
import ErrorPage from '../../components/shared/ErrorPage.jsx'

function useHome() {
  const { activeProfile } = useAuth()
  return activeProfile?.redirect_to || '/'
}

export function Forbidden() {
  return (
    <ErrorPage
      code={403}
      description="Votre profil actif ne donne pas accès à cette page. Changez de profil si vous en avez plusieurs, ou contactez l’administrateur."
      homeTo={useHome()}
      icon="lock"
      title="Accès refusé"
    />
  )
}

export function NotFound() {
  return (
    <ErrorPage
      code={404}
      description="La page demandée n’existe pas ou a été déplacée. Vérifiez l’adresse ou revenez à l’accueil."
      icon="search"
      standalone
      title="Page introuvable"
    />
  )
}

export function SessionExpired() {
  return (
    <ErrorPage
      code={419}
      description="Votre session a expiré pour des raisons de sécurité. Reconnectez-vous pour continuer."
      homeTo="/connexion"
      icon="clock"
      standalone
      title="Session expirée"
    />
  )
}

export function ServerError({ standalone = false }) {
  return (
    <ErrorPage
      code={500}
      description="Le serveur a rencontré un problème. Réessayez dans quelques instants ; si le problème persiste, contactez l’administrateur."
      homeTo={useHome()}
      reload
      standalone={standalone}
      title="Erreur du serveur"
    />
  )
}

export function Maintenance({ standalone = false }) {
  return (
    <ErrorPage
      code={503}
      description="L’application est momentanément indisponible, probablement pour maintenance. Réessayez dans quelques minutes."
      homeTo={null}
      icon="technical"
      reload
      standalone={standalone}
      title="Service indisponible"
    />
  )
}
