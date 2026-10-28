import Button from './Button.jsx'
import Modal from './Modal.jsx'
import './DetailsModal.css'

/**
 * Fenêtre « Voir » d'une ligne de tableau : toutes ses informations, une par ligne, en lecture.
 * Le tableau garde l'essentiel ; le détail complet est ici.
 *
 * @param {{ label: string, value: import('react').ReactNode }[]} props.items
 * @param {import('react').ReactNode} [props.actions] Boutons à côté de « Fermer » (ex. « Modifier »).
 */
function DetailsModal({ open, title, subtitle, items = [], actions, onClose }) {
  return (
    <Modal
      footer={(
        <>
          <Button type="button" variant="secondary" onClick={onClose}>Fermer</Button>
          {actions}
        </>
      )}
      open={open}
      size="md"
      subtitle={subtitle}
      title={title}
      onClose={onClose}
    >
      <dl className="details-modal">
        {items.map((item) => (
          <div className="details-modal__row" key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value === null || item.value === undefined || item.value === '' ? '—' : item.value}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  )
}

export default DetailsModal
