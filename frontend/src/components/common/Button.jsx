import './Button.css'

function Button({ children, variant = 'primary', size, className = '', ...props }) {
  const classes = ['sar-button', `sar-button--${variant}`, size === 'small' ? 'sar-button--small' : '', className].filter(Boolean).join(' ')
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}

export default Button
