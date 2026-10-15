import './Card.css'

/**
 * Carte standard : surface blanche arrondie avec ombre légère.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.title] Titre de la carte (h2).
 * @param {import('react').ReactNode} [props.description]
 * @param {import('react').ReactNode} [props.actions] Boutons alignés à droite du titre.
 * @param {'section'|'article'|'div'} [props.as='section']
 * @param {boolean} [props.flush] Sans marge intérieure (tableaux pleine largeur).
 */
function Card({ title, description, actions, as: Tag = 'section', flush = false, className = '', children, ...props }) {
  return (
    <Tag className={['sar-card', flush ? 'sar-card--flush' : '', className].filter(Boolean).join(' ')} {...props}>
      {(title || actions) && (
        <header className="sar-card__header">
          <div>
            {title && <h2 className="sar-h3">{title}</h2>}
            {description && <p className="sar-caption">{description}</p>}
          </div>
          {actions && <div className="sar-card__actions">{actions}</div>}
        </header>
      )}
      {children}
    </Tag>
  )
}

export default Card
