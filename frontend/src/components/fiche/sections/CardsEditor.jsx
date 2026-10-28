import Button from '../../ui/Button.jsx'
import IconButton from '../../ui/IconButton.jsx'
import { CellLabel } from './cellLabel.js'
import './CardsEditor.css'

/**
 * Liste de fiches éditables, une carte par ligne : chaque champ garde son libellé visible
 * et la carte s'adapte à la largeur, sans tableau à faire défiler. La suppression d'une
 * carte n'est effective qu'à l'enregistrement de la section.
 *
 * `fields` : { key, label, render(row, setRow, index), wide?, half?, hidden?(row) } — `half` occupe
 * la moitié de la carte (une preuve écrite à côté de sa pièce jointe, par exemple).
 */
function CardsEditor({
  rows, fields, onChange, newRow, readOnly, title, badges, locked = () => false, lockedLabel,
  addLabel = 'Ajouter', emptyLabel = 'Aucune ligne.', canRemove = () => true, rowKey,
}) {
  const setRow = (index) => (field, value) => onChange(rows.map((row, current) => (current === index ? { ...row, [field]: value } : row)))
  const removeRow = (index) => onChange(rows.filter((_, current) => current !== index))

  return (
    <div className="cards-editor">
      {rows.length === 0 && <p className="cards-editor__empty">{emptyLabel}</p>}
      {rows.map((row, index) => {
        const rowLocked = readOnly || locked(row)
        return (
          <article className={`cards-editor__card${rowLocked && !readOnly ? ' is-locked' : ''}`} key={rowKey?.(row, index) ?? row.id ?? `new-${index}`}>
            <header className="cards-editor__header">
              <span className="cards-editor__title">{title(row, index)}</span>
              <span className="cards-editor__badges">{badges?.(row, index)}</span>
              {!readOnly && !locked(row) && canRemove(row) && (
                <IconButton icon="x" label="Retirer" onClick={() => removeRow(index)} />
              )}
            </header>
            {rowLocked && !readOnly && lockedLabel && <p className="cards-editor__locked">{lockedLabel(row)}</p>}
            <div className="cards-editor__fields">
              {fields.filter((field) => !field.hidden?.(row)).map((field) => (
                <div className={`cards-editor__field${field.wide ? ' cards-editor__field--wide' : ''}${field.half ? ' cards-editor__field--half' : ''}`} key={field.key}>
                  <span className="cards-editor__label">{field.label}</span>
                  <CellLabel.Provider value={`${field.label}, ${title(row, index)}`}>
                    {field.render(row, setRow(index), index, rowLocked)}
                  </CellLabel.Provider>
                </div>
              ))}
            </div>
          </article>
        )
      })}
      {!readOnly && newRow && (
        <Button icon="plus" type="button" variant="secondary" onClick={() => onChange([...rows, newRow()])}>{addLabel}</Button>
      )}
    </div>
  )
}

export default CardsEditor
