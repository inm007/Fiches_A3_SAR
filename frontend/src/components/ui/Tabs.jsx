import { useRef } from 'react'
import './Tabs.css'

/**
 * Onglets accessibles (rôle tablist, flèches gauche/droite, Début/Fin).
 *
 * @param {object} props
 * @param {{ key: string, label: string, count?: number }[]} props.tabs
 * @param {string} props.active Clé de l'onglet actif.
 * @param {(key: string) => void} props.onChange
 * @param {string} props.label Nom accessible de la liste d'onglets.
 * @param {string} [props.idPrefix] Préfixe des id ; le panneau associé porte l'id `${idPrefix}-panel-${key}`.
 */
function Tabs({ tabs, active, onChange, label, idPrefix = 'tab' }) {
  const listRef = useRef(null)

  function handleKeyDown(event) {
    const index = tabs.findIndex((tab) => tab.key === active)
    const next = {
      ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }[event.key]
    if (next === undefined) return
    event.preventDefault()
    onChange(tabs[next].key)
    listRef.current?.querySelectorAll('[role="tab"]')[next]?.focus()
  }

  return (
    <div aria-label={label} className="sar-tabs" ref={listRef} role="tablist" onKeyDown={handleKeyDown}>
      {tabs.map((tab) => {
        const selected = active === tab.key
        return (
          <button
            aria-controls={`${idPrefix}-panel-${tab.key}`}
            aria-selected={selected}
            className={selected ? 'is-active' : undefined}
            id={`${idPrefix}-${tab.key}`}
            key={tab.key}
            role="tab"
            tabIndex={selected ? 0 : -1}
            type="button"
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
            {tab.count > 0 && <span className="sar-tabs__count">{tab.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

export default Tabs
