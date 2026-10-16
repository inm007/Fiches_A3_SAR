import { useEffect, useId, useRef, useState } from 'react'
import Dropdown from '../ui/Dropdown.jsx'
import Icon from '../ui/Icon.jsx'
import { formatDate } from '../../utils/format.js'

// Styles : shared/ListToolbar.css, chargé globalement par index.css.

// Barre de recherche et de filtres commune à toutes les listes, sur une seule ligne :
// <ListToolbar>
//   <SearchField value={q} onChange={setQ} placeholder="N°, titre…" />
//   <FilterSelect label="État" value={etat} onChange={setEtat} options={[['lu', 'Lues']]} />
//   <ToolbarActions><ResultCount count={total} singular="fiche" />…boutons</ToolbarActions>
// </ListToolbar>

/** Conteneur de la barre. `plain` : sans cadre, quand la barre est déjà dans une carte. */
export function ListToolbar({ children, className = '', plain = false }) {
  return <div className={['sar-list-toolbar', plain ? 'sar-list-toolbar--plain' : '', className].filter(Boolean).join(' ')}>{children}</div>
}

/** Champ de recherche plein texte avec loupe ; le libellé reste lisible par les lecteurs d'écran. */
export function SearchField({ label = 'Rechercher', value, onChange, placeholder, id }) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className="sar-list-toolbar__search">
      <label className="sar-sr-only" htmlFor={inputId}>{label}</label>
      <Icon name="search" size={18} />
      <input id={inputId} placeholder={placeholder ?? label} type="search" value={value} onChange={(event) => onChange(event.target.value)} />
      {value && (
        <button aria-label="Effacer la recherche" className="sar-list-toolbar__clear" type="button" onClick={() => onChange('')}>
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  )
}

/** Filtre en pastille : « Étape », puis « Étape : En cours » une fois choisi. `options` : paires [valeur, libellé]. */
export function FilterSelect({ label, value, onChange, options, allLabel = 'Toutes' }) {
  return (
    <Dropdown
      aria-label={`Filtrer par ${label.toLocaleLowerCase('fr')}`}
      options={options}
      placeholder={allLabel}
      prefix={label}
      value={value}
      variant="filter"
      onChange={onChange}
    />
  )
}

/** Filtre de période en pastille : ouvre un petit panneau « du / au ». Les valeurs sont au format AAAA-MM-JJ. */
export function DateRangeFilter({ label = 'Période', from, to, onChange }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const panelId = useId()
  const active = Boolean(from || to)
  const summary = from && to ? `${formatDate(from)} – ${formatDate(to)}` : from ? `depuis le ${formatDate(from)}` : to ? `jusqu’au ${formatDate(to)}` : ''

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    const onKey = (event) => { if (event.key === 'Escape') { event.stopPropagation(); setOpen(false) } }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="sar-date-range" ref={rootRef}>
      <button
        aria-controls={panelId}
        aria-expanded={open}
        className={['sar-dropdown', 'sar-dropdown--filter', active ? 'has-value' : 'is-empty', open ? 'is-open' : ''].filter(Boolean).join(' ')}
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="sar-dropdown__value">
          <span className="sar-dropdown__prefix">{label}{active ? ' :' : ''}</span>
          {active && <span className="sar-dropdown__text">{summary}</span>}
        </span>
        <Icon className="sar-dropdown__chevron" name="calendar" size={16} />
      </button>
      {open && (
        <div aria-label={label} className="sar-date-range__panel" id={panelId} role="group">
          <label>
            Du
            <input max={to || undefined} type="date" value={from} onChange={(event) => onChange({ from: event.target.value, to })} />
          </label>
          <label>
            Au
            <input min={from || undefined} type="date" value={to} onChange={(event) => onChange({ from, to: event.target.value })} />
          </label>
          {active && <button className="sar-date-range__reset" type="button" onClick={() => onChange({ from: '', to: '' })}>Effacer la période</button>}
        </div>
      )}
    </div>
  )
}

/** Compteur de résultats, accordé au pluriel (« 1 fiche », « 3 fiches »). */
export function ResultCount({ count = 0, singular = 'résultat', plural = `${singular}s` }) {
  return <span aria-live="polite" className="sar-list-toolbar__count"><strong>{count}</strong> {count > 1 ? plural : singular}</span>
}

/** Fin de la ligne : compteur et boutons (réinitialiser, exporter), alignés à droite. */
export function ToolbarActions({ children }) {
  return <div className="sar-list-toolbar__actions">{children}</div>
}
