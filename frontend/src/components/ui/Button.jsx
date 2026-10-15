import Icon from './Icon.jsx'
import Spinner from './Spinner.jsx'
import './Button.css'

/**
 * Bouton de l'application.
 *
 * @param {object} props
 * @param {'primary'|'secondary'|'success'|'danger'|'danger-solid'|'export'|'edit'} [props.variant='primary']
 * @param {'small'} [props.size]
 * @param {string} [props.icon] Icône affichée avant le libellé.
 * @param {boolean} [props.loading] Envoi en cours : le bouton est désactivé et affiche un spinner.
 * @param {string} [props.loadingLabel] Libellé pendant l'envoi (par défaut le libellé normal).
 */
function Button({ children, variant = 'primary', size, icon, loading = false, loadingLabel, disabled, className = '', ...props }) {
  const classes = ['sar-button', `sar-button--${variant}`, size === 'small' ? 'sar-button--small' : '', className].filter(Boolean).join(' ')
  return (
    <button aria-busy={loading || undefined} className={classes} disabled={disabled || loading} {...props}>
      {loading ? <Spinner size="sm" /> : icon && <Icon name={icon} size={16} />}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  )
}

export default Button
