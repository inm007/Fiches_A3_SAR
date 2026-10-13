import './Breadcrumb.css'

function Breadcrumb({ items = [] }) {
  return (
    <nav aria-label="Fil d’Ariane" className="sar-breadcrumb">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>{index > 0 ? ' / ' : ''}{item.label}</span>
      ))}
    </nav>
  )
}

export default Breadcrumb
