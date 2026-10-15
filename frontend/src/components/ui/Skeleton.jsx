import './Skeleton.css'

/**
 * Bloc gris animé pendant un chargement.
 *
 * @param {object} props
 * @param {string|number} [props.width='100%']
 * @param {number} [props.height=18]
 * @param {number} [props.lines] Affiche plusieurs lignes empilées (paragraphe, liste).
 */
function Skeleton({ width = '100%', height = 18, lines }) {
  if (lines) {
    return (
      <span aria-busy="true" aria-label="Chargement…" className="sar-skeleton-lines" role="status">
        {Array.from({ length: lines }, (_, index) => (
          <span aria-hidden="true" className="sar-skeleton" key={index} style={{ width: index === lines - 1 ? '60%' : '100%', height }} />
        ))}
      </span>
    )
  }
  return <span aria-hidden="true" className="sar-skeleton" style={{ width, height }} />
}

export default Skeleton
