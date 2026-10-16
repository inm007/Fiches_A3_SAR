import Dropdown from './Dropdown.jsx'
import Icon from './Icon.jsx'
import './ListPagination.css'

/** Numéros affichés : la première, la dernière et deux voisines de la page courante, séparées par « … ». */
function pageWindow(page, pageCount) {
  const pages = new Set([1, pageCount, page - 1, page, page + 1].filter((value) => value >= 1 && value <= pageCount))
  if (page <= 3) [2, 3, 4].forEach((value) => value <= pageCount && pages.add(value))
  if (page >= pageCount - 2) [pageCount - 3, pageCount - 2, pageCount - 1].forEach((value) => value >= 1 && pages.add(value))
  const sorted = [...pages].sort((a, b) => a - b)
  return sorted.flatMap((value, index) => (index > 0 && value - sorted[index - 1] > 1 ? [`gap-${value}`, value] : [value]))
}

/**
 * Pagination des listes : « 1–10 sur 42 », numéros de page et nombre de lignes par page (10 par défaut).
 *
 * @param {object} props
 * @param {number} props.page
 * @param {number} props.pageSize
 * @param {number} props.total
 * @param {(page: number) => void} props.onPageChange
 * @param {(size: number) => void} props.onPageSizeChange
 * @param {number[]} [props.pageSizes]
 */
function ListPagination({ page, pageSize, total, onPageChange, onPageSizeChange, pageSizes = [10, 25, 50, 100] }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const first = total === 0 ? 0 : ((page - 1) * pageSize) + 1
  const last = Math.min(page * pageSize, total)

  return (
    <footer className="list-pagination">
      <span aria-live="polite" className="list-pagination__count">
        <strong>{first}–{last}</strong> sur <strong>{total}</strong>
      </span>
      {pageCount > 1 && (
        <nav aria-label="Pagination" className="list-pagination__pages">
          <button aria-label="Page précédente" className="list-pagination__step" disabled={page <= 1} type="button" onClick={() => onPageChange(page - 1)}>
            <Icon name="page-previous" size={16} />Précédent
          </button>
          {pageWindow(page, pageCount).map((value) => (typeof value === 'string'
            ? <span aria-hidden="true" className="list-pagination__gap" key={value}>…</span>
            : (
              <button
                aria-current={value === page ? 'page' : undefined}
                aria-label={`Page ${value}`}
                className="list-pagination__page"
                key={value}
                type="button"
                onClick={() => onPageChange(value)}
              >
                {value}
              </button>
            )))}
          <button aria-label="Page suivante" className="list-pagination__step" disabled={page >= pageCount} type="button" onClick={() => onPageChange(page + 1)}>
            Suivant<Icon name="page-next" size={16} />
          </button>
        </nav>
      )}
      <div className="list-pagination__size">
        <span id="list-pagination-size">Lignes par page</span>
        <Dropdown
          aria-labelledby="list-pagination-size"
          options={pageSizes.map((size) => [size, String(size)])}
          placeholder={null}
          value={pageSize}
          variant="small"
          onChange={(size) => onPageSizeChange(Number(size))}
        />
      </div>
    </footer>
  )
}

export default ListPagination
