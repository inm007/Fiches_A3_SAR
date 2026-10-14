import Button from '../../common/Button.jsx'
import './RowsEditor.css'

/**
 * Tableau éditable d'une section. Chaque colonne fournit son rendu de cellule ;
 * la suppression d'une ligne n'est effective qu'à l'enregistrement de la section.
 */
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
                {columns.map((column) => <td key={column.key}>{column.render(row, setRow(index), index)}</td>)}
                {!readOnly && (
                  <td className="rows-editor__remove">
                    {canRemove(row) && (
                      <button aria-label="Retirer la ligne" title="Retirer la ligne" type="button" onClick={() => removeRow(index)}>×</button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && <Button type="button" variant="secondary" onClick={() => onChange([...rows, newRow()])}>+ {addLabel}</Button>}
    </div>
  )
}

export function CellInput({ value, onChange, readOnly, type = 'text', ...props }) {
  return <input className="rows-editor__input" readOnly={readOnly} type={type} value={value ?? ''} onChange={(event) => onChange(event.target.value)} {...props} />
}

export function CellSelect({ value, onChange, readOnly, options, placeholder = '—' }) {
  return (
    <select className="rows-editor__input" disabled={readOnly} value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
    </select>
  )
}

export default RowsEditor
