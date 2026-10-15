import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'
import './Breadcrumb.css'

/**
 * Fil d'Ariane : icône d'accueil, liens intermédiaires, page courante.
 *
 * @param {object} props
 * @param {string} [props.homeTo] Lien de l'icône d'accueil ; sans valeur, pas d'icône.
 * @param {{ label: string, to?: string }[]} props.items Le dernier élément est la page courante.
 * @param {string} [props.className]
 */
function Breadcrumb({ homeTo, items = [], className = '' }) {
  const separator = <Icon className="sar-breadcrumb__sep" name="page-next" size={16} />
  return (
    <nav aria-label="Fil d’Ariane" className={['sar-breadcrumb', className].filter(Boolean).join(' ')}>
      {homeTo && (
        <>
          <Link aria-label="Accueil" className="sar-breadcrumb__home" to={homeTo}><Icon name="home" size={18} /></Link>
          {items.length > 0 && separator}
        </>
      )}
      {items.map((item, index) => {
        const last = index === items.length - 1
        return (
          <span className="sar-breadcrumb__item" key={`${item.label}-${index}`}>
            {last
              ? <strong aria-current="page">{item.label}</strong>
              : <Link className="sar-breadcrumb__link" to={item.to}>{item.label}</Link>}
            {!last && separator}
          </span>
        )
      })}
    </nav>
  )
}

export default Breadcrumb
