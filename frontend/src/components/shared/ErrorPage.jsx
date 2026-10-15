import { Link } from 'react-router-dom'
import Icon from '../ui/Icon.jsx'
import './ErrorPage.css'

/**
 * Page d'erreur commune (403, 404, 419, 500, 503, erreur de rendu).
 *
 * @param {object} props
 * @param {number|string} props.code Code affiché en surtitre.
 * @param {string} props.title
 * @param {string} props.description
 * @param {string} [props.icon='al']
 * @param {string} [props.homeTo='/'] Lien de retour ; null pour le masquer.
 * @param {string} [props.homeLabel='Retour à l’accueil']
 * @param {boolean} [props.reload] Ajoute un bouton « Recharger la page ».
 * @param {boolean} [props.standalone] Page plein écran, hors du gabarit de l'application.
 */
function ErrorPage({ code, title, description, icon = 'al', homeTo = '/', homeLabel = 'Retour à l’accueil', reload = false, standalone = false }) {
  return (
    <section aria-labelledby="error-page-title" className={`error-page${standalone ? ' error-page--standalone' : ''}`}>
      <div className="error-page__card sar-card">
        <span aria-hidden="true" className="error-page__icon"><Icon name={icon} size={26} /></span>
        <p className="sar-overline">Erreur {code}</p>
        <h1 id="error-page-title">{title}</h1>
        <p className="error-page__description">{description}</p>
        <div className="error-page__actions">
          {reload && (
            <button className="sar-button sar-button--primary" type="button" onClick={() => window.location.reload()}>
              Recharger la page
            </button>
          )}
          {homeTo && (
            <Link className={`sar-button ${reload ? 'sar-button--secondary' : 'sar-button--primary'}`} to={homeTo}>
              {homeLabel}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

export default ErrorPage
