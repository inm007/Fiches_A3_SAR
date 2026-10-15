import Icon from './Icon.jsx'
import './Alert.css'

const icons = { success: 'ok', error: 'al', warning: 'al', info: 'info' }

// Un message ne passe jamais par la couleur seule : il porte toujours une icône (UX §2.2).
function Alert({ children, severity = 'info' }) {
  return (
    <div className={`sar-alert sar-alert--${severity}`} role={severity === 'error' ? 'alert' : 'status'}>
      <Icon name={icons[severity]} />
      <div>{children}</div>
    </div>
  )
}

export default Alert
