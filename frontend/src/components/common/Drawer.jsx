import './Drawer.css'

function Drawer({ open = false, title, children }) {
  if (!open) return null
  return (
    <aside aria-label={title} className="sar-drawer">
      <h2>{title}</h2>
      {children}
    </aside>
  )
}

export default Drawer
