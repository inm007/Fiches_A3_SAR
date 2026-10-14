import './FormControls.css'

// Champs avec libellé visible, aide et lecture seule (UX §10.2).

function Field({ label, required, hint, children, wide }) {
  return (
    <label className={`sar-field${wide ? ' sar-field--wide' : ''}`}>
      <span className="sar-field__label">{label}{required && <abbr title="obligatoire"> *</abbr>}</span>
      {children}
      {hint && <span className="sar-field__hint">{hint}</span>}
    </label>
  )
}

export function TextInput({ label, required, hint, wide, value, onChange, readOnly, ...props }) {
  return (
    <Field hint={hint} label={label} required={required} wide={wide}>
      <input readOnly={readOnly} value={value ?? ''} onChange={(event) => onChange?.(event.target.value)} {...props} />
    </Field>
  )
}

export function TextArea({ label, required, hint, value, onChange, readOnly, rows = 3, ...props }) {
  return (
    <Field hint={hint} label={label} required={required} wide>
      <textarea readOnly={readOnly} rows={rows} value={value ?? ''} onChange={(event) => onChange?.(event.target.value)} {...props} />
    </Field>
  )
}

export function Select({ label, required, hint, wide, value, onChange, options, readOnly, placeholder = 'Choisir…', ...props }) {
  return (
    <Field hint={hint} label={label} required={required} wide={wide}>
      <select disabled={readOnly} value={value ?? ''} onChange={(event) => onChange?.(event.target.value)} {...props}>
        <option value="">{placeholder}</option>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </Field>
  )
}

export function Checkbox({ label, checked, onChange, readOnly }) {
  return (
    <label className="sar-checkbox">
      <input checked={Boolean(checked)} disabled={readOnly} type="checkbox" onChange={(event) => onChange?.(event.target.checked)} />
      <span>{label}</span>
    </label>
  )
}
