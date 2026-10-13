import './KpiCard.css'

function KpiCard({ label, value = '—' }) {
  return (
    <article className="kpi-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

export default KpiCard
