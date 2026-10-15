import './Spinner.css'

/**
 * Indicateur de chargement circulaire.
 *
 * @param {object} props
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {string} [props.label] Texte lu par les lecteurs d'écran ; sans libellé, le spinner est décoratif.
 */
function Spinner({ size = 'md', label }) {
  return (
    <span
      aria-hidden={label ? undefined : 'true'}
      aria-label={label}
      className={`sar-spinner sar-spinner--${size}`}
      role={label ? 'status' : undefined}
    />
  )
}

export default Spinner
