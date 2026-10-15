import { useEffect, useId, useRef, useState } from 'react'
import Button from './Button.jsx'
import Icon from './Icon.jsx'
import './Modal.css'

function Modal({
  open = false,
  title,
  subtitle,
  size = 'sm',
  dirty = false,
  onClose,
  children,
  footer,
}) {
  const titleId = useId()
  const dialogRef = useRef(null)
  const restoreFocusRef = useRef(null)
  const closeConfirmFocusRef = useRef(null)
  const currentStateRef = useRef(null)
  const [confirmingClose, setConfirmingClose] = useState(false)
  useEffect(() => {
    currentStateRef.current = { dirty, onClose, confirmingClose }
  }, [dirty, onClose, confirmingClose])

  function requestClose() {
    if (dirty) {
      setConfirmingClose(true)
      return
    }
    onClose?.()
  }

  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    restoreFocusRef.current = document.activeElement
    document.body.style.overflow = 'hidden'

    const focusInitialElement = () => {
      const dialog = dialogRef.current
      if (!dialog) return
      const initial = dialog.querySelector('[data-modal-autofocus]')
        ?? dialog.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])')
      initial?.focus()
      if (!initial) dialog.focus()
    }
    const frame = window.requestAnimationFrame(focusInitialElement)

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (currentStateRef.current.confirmingClose) {
          setConfirmingClose(false)
          return
        }
        if (currentStateRef.current.dirty) setConfirmingClose(true)
        else currentStateRef.current.onClose?.()
        return
      }
      if (event.key !== 'Tab') return

      const dialog = dialogRef.current
      const focusScope = currentStateRef.current.confirmingClose
        ? dialog?.querySelector('.sar-modal__discard')
        : dialog
      const focusable = [...(focusScope?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ) ?? [])].filter((element) => !element.closest('[aria-hidden="true"]'))
      if (!focusable.length) {
        event.preventDefault()
        focusScope?.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (restoreFocusRef.current instanceof HTMLElement && restoreFocusRef.current.isConnected) {
        restoreFocusRef.current.focus()
      }
    }
  }, [open])

  useEffect(() => {
    if (open && confirmingClose) {
      closeConfirmFocusRef.current = document.activeElement
      const button = dialogRef.current?.querySelector('.sar-modal__discard-actions button')
      button?.focus()
    } else if (closeConfirmFocusRef.current instanceof HTMLElement && closeConfirmFocusRef.current.isConnected) {
      closeConfirmFocusRef.current.focus()
      closeConfirmFocusRef.current = null
    }
  }, [confirmingClose, open])
  const footerContent = typeof footer === 'function' ? footer({ requestClose }) : footer

  return (
    <div
      aria-hidden={!open}
      className={`sar-modal__overlay${open ? ' is-open' : ''}`}
      onClick={(event) => {
        if (open && event.target === event.currentTarget && !confirmingClose) requestClose()
      }}
    >
      <section
        aria-labelledby={titleId}
        aria-modal={open || undefined}
        className={`sar-modal sar-modal--${size}${open ? ' is-open' : ''}`}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="sar-modal__header">
          <div className="sar-modal__heading">
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button aria-label="Fermer" className="sar-modal__close" onClick={requestClose} title="Fermer" type="button">
            <Icon name="x" size={18} />
          </button>
        </header>
        <div className="sar-modal__body">{children}</div>
        {footerContent && <footer className="sar-modal__footer">{footerContent}</footer>}
        {open && confirmingClose && (
          <div aria-labelledby={`${titleId}-confirm`} aria-modal="true" className="sar-modal__discard-overlay" role="alertdialog">
            <section className="sar-modal__discard">
              <span aria-hidden="true" className="sar-modal__warning"><Icon name="al" size={20} /></span>
              <h3 id={`${titleId}-confirm`}>Abandonner les modifications ?</h3>
              <p>Les changements effectués ne seront pas enregistrés.</p>
              <div className="sar-modal__discard-actions">
                <Button onClick={() => setConfirmingClose(false)} type="button" variant="secondary">Continuer</Button>
                <Button onClick={() => { setConfirmingClose(false); onClose?.() }} type="button" variant="danger">Abandonner</Button>
              </div>
            </section>
          </div>
        )}
      </section>
    </div>
  )
}

export default Modal
