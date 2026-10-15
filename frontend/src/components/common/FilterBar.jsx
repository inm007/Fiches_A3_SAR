import './FilterBar.css'

function FilterBar({ children, className = '' }) {
  return <div className={['filter-bar', className].filter(Boolean).join(' ')}>{children}</div>
}

export default FilterBar
