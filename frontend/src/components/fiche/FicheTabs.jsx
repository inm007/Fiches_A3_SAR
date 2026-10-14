import './FicheTabs.css'

function FicheTabs({ tabs, active, onChange }) {
  return (
    <nav aria-label="Rubriques de la fiche" className="fiche-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          aria-selected={active === tab.key}
          className={active === tab.key ? 'is-active' : undefined}
          key={tab.key}
          role="tab"
          type="button"
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
          {tab.count > 0 && <span className="fiche-tabs__count">{tab.count}</span>}
        </button>
      ))}
    </nav>
  )
}

export default FicheTabs
