import { useId } from 'react'
import Dropdown from './Dropdown.jsx'
import './FormControls.css'

// Champs avec libellé visible, aide, erreur et lecture seule (UX §10.2).
// `error` accepte le message renvoyé par la validation Laravel (chaîne ou tableau de chaînes).

function errorText(error) {
  return Array.isArray(error) ? error[0] : error
}

function useFieldIds(hint, error) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  return {
    id,
    hintId,
    errorId,
    a11y: {
      'aria-invalid': error ? true : undefined,
      'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined,
    },
  }
}

function Field({ label, labelId, required, hint, error, hintId, errorId, children, wide }) {
  return (
    <label className={['sar-field', wide ? 'sar-field--wide' : '', error ? 'has-error' : ''].filter(Boolean).join(' ')}>
      <span className="sar-field__label" id={labelId}>{label}{required && <abbr title="obligatoire"> *</abbr>}</span>
      {children}
      {hint && <span className="sar-field__hint" id={hintId}>{hint}</span>}
      {error && <span className="sar-field__error" id={errorId}>{errorText(error)}</span>}
    </label>
  )
}

/** Champ texte. `onChange` reçoit directement la valeur. */
export function TextInput({ label, required, hint, error, wide, value, onChange, readOnly, ...props }) {
  const { hintId, errorId, a11y } = useFieldIds(hint, error)
  return (
    <Field error={error} errorId={errorId} hint={hint} hintId={hintId} label={label} required={required} wide={wide}>
      <input readOnly={readOnly} aria-required={required || undefined} value={value ?? ''} onChange={(event) => onChange?.(event.target.value)} {...a11y} {...props} />
    </Field>
  )
}

/** Zone de texte multiligne. */
export function TextArea({ label, required, hint, error, value, onChange, readOnly, rows = 3, ...props }) {
  const { hintId, errorId, a11y } = useFieldIds(hint, error)
  return (
    <Field error={error} errorId={errorId} hint={hint} hintId={hintId} label={label} required={required} wide>
      <textarea readOnly={readOnly} aria-required={required || undefined} rows={rows} value={value ?? ''} onChange={(event) => onChange?.(event.target.value)} {...a11y} {...props} />
    </Field>
  )
}

/**
 * Liste déroulante (composant Dropdown). `options` : tableau de paires [valeur, libellé] ;
 * `placeholder={null}` retire l'option vide ; `onChange` reçoit la valeur choisie.
 */
export function Select({ label, required, hint, error, wide, value, onChange, options, readOnly, disabled, placeholder = 'Choisir…', ...props }) {
  const { id, hintId, errorId, a11y } = useFieldIds(hint, error)
  return (
    <Field error={error} errorId={errorId} hint={hint} hintId={hintId} label={label} labelId={`${id}-label`} required={required} wide={wide}>
      <Dropdown
        aria-describedby={a11y['aria-describedby']}
        aria-labelledby={`${id}-label ${id}-button`}
        aria-required={required || undefined}
        disabled={readOnly || disabled}
        id={`${id}-button`}
        invalid={Boolean(error)}
        options={options}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        {...props}
      />
    </Field>
  )
}

/** Case à cocher. `onChange` reçoit un booléen. */
export function Checkbox({ label, checked, onChange, readOnly }) {
  return (
    <label className="sar-checkbox">
      <input checked={Boolean(checked)} disabled={readOnly} type="checkbox" onChange={(event) => onChange?.(event.target.checked)} />
      <span>{label}</span>
    </label>
  )
}
