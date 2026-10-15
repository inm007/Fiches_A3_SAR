import Button from './Button.jsx'
import './ListPagination.css'

function ListPagination({ page, pageSize, total, onPageChange, onPageSizeChange, pageSizes = [10, 25, 50, 100] }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const first = total === 0 ? 0 : ((page - 1) * pageSize) + 1
  const last = Math.min(page * pageSize, total)

  return (
    <footer className="list-pagination">
      <span className="list-pagination__count">{first}–{last} sur {total}</span>
      <label>
        Lignes
        <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
          {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
      </label>
      <Button disabled={page <= 1} type="button" variant="secondary" onClick={() => onPageChange(page - 1)}>Précédent</Button>
      <span aria-live="polite">Page {Math.min(page, pageCount)} / {pageCount}</span>
      <Button disabled={page >= pageCount} type="button" variant="secondary" onClick={() => onPageChange(page + 1)}>Suivant</Button>
    </footer>
  )
}

export default ListPagination
