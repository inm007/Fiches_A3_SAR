import IconButton from './IconButton.jsx'
import './ListPagination.css'

function ListPagination({ page, pageSize, total, onPageChange, onPageSizeChange, pageSizes = [10, 25, 50, 100] }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const first = total === 0 ? 0 : ((page - 1) * pageSize) + 1
  const last = Math.min(page * pageSize, total)

  return (
    <footer className="list-pagination">
      <label className="list-pagination__size">
        <span>Nombre par page</span>
        <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
          {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
      </label>
      <span aria-live="polite" className="list-pagination__count">{first}–{last} / {total}</span>
      <nav aria-label="Pagination" className="list-pagination__controls">
        <IconButton disabled={page <= 1} icon="page-first" label="Première page" onClick={() => onPageChange(1)} />
        <IconButton disabled={page <= 1} icon="page-previous" label="Page précédente" onClick={() => onPageChange(page - 1)} />
        <IconButton disabled={page >= pageCount} icon="page-next" label="Page suivante" onClick={() => onPageChange(page + 1)} />
        <IconButton disabled={page >= pageCount} icon="page-last" label="Dernière page" onClick={() => onPageChange(pageCount)} />
      </nav>
    </footer>
  )
}

export default ListPagination
