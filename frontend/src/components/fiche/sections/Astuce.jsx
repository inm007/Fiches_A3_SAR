import { useState } from 'react'
import Icon from '../../ui/Icon.jsx'
import './Astuce.css'

/**
 * Encadré « Astuce » repliable : explique au pilote quoi écrire et pourquoi, sans
 * encombrer la section. Ouvert par défaut tant que la section est à remplir.
 */
export default function Astuce({ titre = 'Astuce', children, ouvert = false }) {
  return (
    <details className="astuce" open={ouvert}>
      <summary><Icon name="info" size={15} />{titre}</summary>
      <div className="astuce__body">{children}</div>
    </details>
  )
}

/**
 * Groupe de pastilles à bascule (choix multiples) : plus rapide qu'une liste de cases.
 * `options` : paires [code, libellé] ; `value` : codes choisis.
 */
export function Pastilles({ options, value, onChange, readOnly, label }) {
  const toggle = (code) => onChange(value.includes(code) ? value.filter((current) => current !== code) : [...value, code])
  return (
    <div aria-label={label} className="pastilles" role="group">
      {options.map(([code, libelle]) => {
        const actif = value.includes(code)
        return (
          <button
            aria-pressed={actif}
            className={`pastille${actif ? ' is-active' : ''}`}
            disabled={readOnly}
            key={code}
            type="button"
            onClick={() => toggle(code)}
          >
            {actif && <Icon name="check" size={13} />}
            {libelle}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Liste de noms saisis un par un (Entrée ou bouton Ajouter), affichés en pastilles retirables.
 */
export function ListeNoms({ label, hint, value, onChange, readOnly, placeholder = 'Nom et fonction' }) {
  const [saisie, setSaisie] = useState('')
  const ajouter = () => {
    const nom = saisie.trim()
    if (!nom) return
    if (!value.includes(nom)) onChange([...value, nom])
    setSaisie('')
  }

  return (
    <div className="sar-field sar-field--wide">
      <span className="sar-field__label">{label}</span>
      <div className="liste-noms">
        {value.length === 0 && readOnly && <span className="fiche-section__muted">Personne pour l’instant.</span>}
        {value.map((nom) => (
          <span className="liste-noms__item" key={nom}>
            {nom}
            {!readOnly && (
              <button aria-label={`Retirer ${nom}`} type="button" onClick={() => onChange(value.filter((current) => current !== nom))}>
                <Icon name="x" size={12} />
              </button>
            )}
          </span>
        ))}
      </div>
      {!readOnly && (
        <div className="liste-noms__ajout">
          <input
            aria-label={`Ajouter à : ${label}`}
            placeholder={placeholder}
            type="text"
            value={saisie}
            onChange={(event) => setSaisie(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              ajouter()
            }}
          />
          <button className="pastille" disabled={!saisie.trim()} type="button" onClick={ajouter}><Icon name="plus" size={13} />Ajouter</button>
        </div>
      )}
      {hint && <span className="sar-field__hint">{hint}</span>}
    </div>
  )
}
