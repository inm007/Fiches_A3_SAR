import './Alert.css'

function Alert({ children, severity = 'info' }) {
  return <div className={`sar-alert sar-alert--${severity}`} role="status">{children}</div>
}

export default Alert
