import Button from './Button.jsx'
import './ConfirmDialog.css'

function ConfirmDialog({ open = false, title, children, onCancel, onConfirm }) {
  if (!open) return null
  return (
    <div className="dialog-backdrop">
      <section aria-labelledby="confirm-dialog-title" aria-modal="true" className="confirm-dialog" role="dialog">
        <h2 id="confirm-dialog-title">{title}</h2>
        <div>{children}</div>
        <footer>
          <Button onClick={onCancel} variant="secondary">Annuler</Button>
          <Button onClick={onConfirm} variant="danger">Confirmer</Button>
        </footer>
      </section>
    </div>
  )
}

export default ConfirmDialog
