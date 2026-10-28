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
