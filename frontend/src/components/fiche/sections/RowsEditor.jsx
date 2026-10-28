import { useContext } from 'react'
import Dropdown from '../../ui/Dropdown.jsx'
import { CellLabel } from './cellLabel.js'
import './RowsEditor.css'

// Cellules de saisie des sections : leur libellé accessible vient du CellLabel posé par CardsEditor.

export function CellInput({ value, onChange, readOnly, type = 'text', ...props }) {
  const label = useContext(CellLabel)
  return <input aria-label={label} className="rows-editor__input" readOnly={readOnly} type={type} value={value ?? ''} onChange={(event) => onChange(event.target.value)} {...props} />
}

export function CellTextArea({ value, onChange, readOnly, rows = 2, ...props }) {
  const label = useContext(CellLabel)
  return <textarea aria-label={label} className="rows-editor__input" readOnly={readOnly} rows={rows} value={value ?? ''} onChange={(event) => onChange(event.target.value)} {...props} />
}

export function CellSelect({ value, onChange, readOnly, options, placeholder = '—' }) {
  const label = useContext(CellLabel)
  return <Dropdown aria-label={label} className="rows-editor__dropdown" disabled={readOnly} options={options} placeholder={placeholder} value={value ?? ''} variant="small" onChange={onChange} />
}
