import { Component } from 'react'
import ErrorPage from './ErrorPage.jsx'

/**
 * Évite l'écran blanc : une erreur de rendu affiche une page d'erreur avec rechargement.
 * Placer une `key` (ex. le chemin courant) pour réinitialiser l'erreur à chaque navigation.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Erreur d’affichage SAR.', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <ErrorPage
        code="d’affichage"
        description="Un problème inattendu empêche l’affichage de cette page. Rechargez-la ; si le problème persiste, contactez l’administrateur."
        homeTo={this.props.homeTo ?? '/'}
        reload
        standalone={this.props.standalone}
        title="Cette page n’a pas pu s’afficher"
      />
    )
  }
}

export default ErrorBoundary
