import './FormControls.css'

/**
 * Champ natif (onChange reçoit l'événement) avec le même rendu que `TextInput`.
 * À utiliser dans les formulaires qui s'appuient sur la validation du navigateur
 * (required, pattern, minLength), comme les pages de mot de passe.
 */
function FormField({ label, id, error, hint, required, ...inputProps }) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  return (
    <label className={['sar-field', error ? 'has-error' : ''].filter(Boolean).join(' ')} htmlFor={id}>
      <span className="sar-field__label">{label}{required && <abbr title="obligatoire"> *</abbr>}</span>
      <input
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        aria-invalid={error ? true : undefined}
        id={id}
        required={required}
        {...inputProps}
      />
      {hint && <span className="sar-field__hint" id={hintId}>{hint}</span>}
      {error && <span className="sar-field__error" id={errorId}>{Array.isArray(error) ? error[0] : error}</span>}
    </label>
  )
}

export default FormField
