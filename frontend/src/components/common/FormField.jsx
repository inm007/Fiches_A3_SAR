import './FormField.css'

function FormField({ label, id, error, hint, ...inputProps }) {
  return (
    <label className="form-field" htmlFor={id}>
      <span className="form-field__label">{label}</span>
      <input aria-invalid={Boolean(error)} id={id} {...inputProps} />
      {hint && <span className="form-field__hint">{hint}</span>}
      {error && <span className="form-field__error">{error}</span>}
    </label>
  )
}

export default FormField
