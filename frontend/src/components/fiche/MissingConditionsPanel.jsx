import './MissingConditionsPanel.css'

function MissingConditionsPanel({ conditions = [] }) {
  if (!conditions.length) return null
  return (
    <aside className="missing-conditions">
      <h2>Conditions manquantes</h2>
      <ul>{conditions.map((condition) => <li key={condition}>{condition}</li>)}</ul>
    </aside>
  )
}

export default MissingConditionsPanel
