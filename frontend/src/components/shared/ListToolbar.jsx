// Styles : shared/ListToolbar.css, chargé globalement par index.css.

// Barre de recherche et de filtres commune à toutes les listes.
// <ListToolbar>
//   <SearchField value={q} onChange={setQ} placeholder="N°, titre…" />
//   <FilterSelect label="État" value={etat} onChange={setEtat} options={[['lu', 'Lues']]} />
//   <ResultCount count={total} singular="fiche" />
//   …boutons
// </ListToolbar>

/** Conteneur de la barre. */
export function ListToolbar({ children, className = '' }) {
  return <div className={['sar-list-toolbar', className].filter(Boolean).join(' ')}>{children}</div>
}

/** Champ de recherche plein texte ; `onChange` reçoit la valeur. */
export function SearchField({ label = 'Rechercher', value, onChange, placeholder, id }) {
  return (
    <label className="sar-list-toolbar__search" htmlFor={id}>
      {label}
      <input id={id} placeholder={placeholder} type="search" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

/** Filtre par liste ; `options` : paires [valeur, libellé], première option « Toutes ». */
export function FilterSelect({ label, value, onChange, options, allLabel = 'Toutes' }) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{allLabel}</option>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  )
}

/** Compteur de résultats, accordé au pluriel (« 1 fiche », « 3 fiches »). */
export function ResultCount({ count = 0, singular = 'résultat', plural = `${singular}s` }) {
  return <span aria-live="polite" className="sar-list-toolbar__count">{count} {count > 1 ? plural : singular}</span>
}

/** Ligne du bas de la barre : compteur à gauche, boutons (réinitialiser, exporter) à droite. */
export function ToolbarActions({ children }) {
  return <div className="sar-list-toolbar__actions">{children}</div>
}
