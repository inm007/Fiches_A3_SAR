import Icon from './Icon.jsx'
import './IconButton.css'

function IconButton({ label, icon, tone = 'neutral', className = '', ...props }) {
  return (
    <button
      aria-label={label}
      className={['icon-button', `icon-button--${tone}`, className].filter(Boolean).join(' ')}
      title={label}
      type="button"
      {...props}
    >
      <Icon name={icon} size={16} />
    </button>
  )
}

export default IconButton
