import Icon from './Icon.jsx'
import './Badge.css'

function Badge({ children, tone = 'neutral', icon }) {
  return (
    <span className={`sar-badge sar-badge--${tone}`}>
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  )
}

export default Badge
