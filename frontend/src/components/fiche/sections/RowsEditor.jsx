import { createContext, useContext } from 'react'
import Button from '../../ui/Button.jsx'
import Dropdown from '../../ui/Dropdown.jsx'
import IconButton from '../../ui/IconButton.jsx'
import './RowsEditor.css'

/**
 * Tableau éditable d'une section. Chaque colonne fournit son rendu de cellule ;
 * la suppression d'une ligne n'est effective qu'à l'enregistrement de la section.
 */
// Libellé de colonne transmis aux cellules : chaque champ du tableau a un nom accessible.
const CellLabel = createContext(undefined)

function RowsEditor({ rows, columns, onChange, newRow, readOnly, addLabel = 'Ajouter une ligne', emptyLabel = 'Aucune ligne.', canRemove = () => true }) {
  const setRow = (index) => (field, value) => onChange(rows.map((row, current) => (current === index ? { ...row, [field]: value } : row)))
  const removeRow = (index) => onChange(rows.filter((_, current) => current !== index))

  return (
    <div className="rows-editor">
      <div className="rows-editor__scroll">
        <table>
          <thead>
            <tr>
              {columns.map((column) => <th key={column.key} scope="col" style={{ minWidth: column.width }}>{column.label}</th>)}
              {!readOnly && <th aria-label="Retirer" />}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td className="rows-editor__empty" colSpan={columns.length + 1}>{emptyLabel}</td></tr>
            )}
            {rows.map((row, index) => (
              <tr key={row.id ?? `new-${index}`}>
                {columns.map((column) => (
                  <td key={column.key}>
                    <CellLabel.Provider value={`${column.label}, ligne ${index + 1}`}>{column.render(row, setRow(index), index)}</CellLabel.Provider>
                  </td>
                ))}
                {!readOnly && (
                  <td className="rows-editor__remove">
                    {canRemove(row) && (
                      <IconButton icon="x" label="Retirer la ligne" onClick={() => removeRow(index)} />
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && <Button icon="plus" type="button" variant="secondary" onClick={() => onChange([...rows, newRow()])}>{addLabel}</Button>}
    </div>
  )
}

export function CellInput({ value, onChange, readOnly, type = 'text', ...props }) {
  const label = useContext(CellLabel)
  return <input aria-label={label} className="rows-editor__input" readOnly={readOnly} type={type} value={value ?? ''} onChange={(event) => onChange(event.target.value)} {...props} />
}

export function CellSelect({ value, onChange, readOnly, options, placeholder = '—' }) {
  const label = useContext(CellLabel)
  return <Dropdown aria-label={label} className="rows-editor__dropdown" disabled={readOnly} options={options} placeholder={placeholder} value={value ?? ''} variant="small" onChange={onChange} />
}

export default RowsEditor
