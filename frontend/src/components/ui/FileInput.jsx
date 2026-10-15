import { useId } from 'react'
import Icon from './Icon.jsx'
import './FormControls.css'
import './FileInput.css'

/**
 * Sélecteur de fichier en français (le bouton natif suit la langue du navigateur).
 * Le champ natif reste dans le formulaire : `required`, `accept` et la réinitialisation du formulaire fonctionnent.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {File|null} props.file Fichier choisi, affiché à côté du bouton.
 * @param {(file: File|null) => void} props.onChange
 * @param {string} [props.accept]
 * @param {boolean} [props.required]
 */
function FileInput({ label, file, onChange, accept, required }) {
  const id = useId()
  return (
    <div className="sar-field sar-file">
      <span className="sar-field__label">{label}{required && <abbr title="obligatoire"> *</abbr>}</span>
      <span className="sar-file__control">
        <input
          accept={accept}
          className="sar-file__native"
          id={id}
          required={required}
          type="file"
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        />
        <label className="sar-button sar-button--secondary sar-button--small sar-file__button" htmlFor={id}>
          <Icon name="file" size={16} />Choisir un fichier
        </label>
        <span className={`sar-file__name${file ? '' : ' is-empty'}`} title={file?.name}>{file?.name ?? 'Aucun fichier choisi'}</span>
      </span>
    </div>
  )
}

export default FileInput
