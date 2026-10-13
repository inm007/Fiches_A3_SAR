import './Button.css'

function Button({ children, variant = 'primary', className = '', ...props }) {
  return (
    <button className={`sar-button sar-button--${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}

export default Button
