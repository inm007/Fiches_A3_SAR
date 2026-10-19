import Button from './Button.jsx'
import './ConfirmDialog.css'

function ConfirmDialog({ open = false, title, children, onCancel, onConfirm, confirmLabel = 'Confirmer', cancelLabel = 'Annuler', variant = 'danger-solid', busy = false, disabled = false }) {
  if (!open) return null
  return (
    <div className="dialog-backdrop">
      <section aria-labelledby="confirm-dialog-title" aria-modal="true" className="confirm-dialog" role="dialog">
        <h2 id="confirm-dialog-title">{title}</h2>
        <div className="confirm-dialog__body">{children}</div>
        <footer>
          <Button disabled={busy} onClick={onCancel} variant="secondary">{cancelLabel}</Button>
          <Button disabled={busy || disabled} onClick={onConfirm} variant={variant}>{busy ? 'Envoi…' : confirmLabel}</Button>
        </footer>
      </section>
    </div>
  )
}

export default ConfirmDialog
