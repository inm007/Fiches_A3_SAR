import EmptyState from './EmptyState.jsx'
import Skeleton from './Skeleton.jsx'
import './DataTable.css'

function DataTable({
  columns = [],
  rows = [],
  emptyMessage = 'Aucun résultat.',
  emptyDescription,
  emptyAction,
  loading = false,
  actions,
  actionsWidth,
  context,
  variant = 'default',
  onRowClick,
}) {
  const compact = variant === 'compact'
  const classes = ['data-table__scroll', compact ? 'data-table__scroll--compact' : ''].filter(Boolean).join(' ')

  if (!loading && !rows.length) {
    return (
      <div className={compact ? classes : undefined}>
        <EmptyState
          action={emptyAction}
          description={emptyDescription ?? (compact ? 'Modifiez les critères de recherche ou ajoutez un élément.' : undefined)}
          icon="search"
          title={emptyMessage}
        />
      </div>
    )
  }

  return (
    <div aria-busy={loading} className={classes}>
      <table className={`data-table${compact ? ' data-table--compact' : ''}`}>
        {compact && (
          <colgroup>
            {columns.map((column) => <col className={column.className} key={column.key} style={column.width ? { width: column.width } : undefined} />)}
            {actions && <col className="data-table__actions-column" style={actionsWidth ? { width: actionsWidth } : undefined} />}
          </colgroup>
        )}
        <thead>
          <tr>
            {columns.map((column) => <th className={column.className} key={column.key} scope="col">{column.header ?? column.label}</th>)}
            {actions && <th scope="col">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }, (_, index) => (
              <tr className="data-table__skeleton-row" key={`skeleton-${index}`}>
                {columns.map((column) => <td key={column.key}><Skeleton height={14} width={index % 2 ? '72%' : '86%'} /></td>)}
                {actions && <td><Skeleton height={32} width={72} /></td>}
              </tr>
            ))
            : rows.map((row, index) => (
              <tr
                className={onRowClick ? 'data-table__row--clickable' : undefined}
                key={row.id ?? index}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => {
                  const value = column.render
                    ? column.render(row, context)
                    : column.value
                      ? column.value(row, context)
                      : row[column.key]
                  const title = column.titleValue
                    ? column.titleValue(row, context)
                    : typeof value === 'string' || typeof value === 'number'
                      ? value
                      : undefined
                  return (
                    <td className={column.className} data-label={column.label} key={column.key}>
                      {column.render || column.value
                        ? value ?? '—'
                        : <span className="data-table__cell-text" title={title ? String(title) : undefined}>{value ?? '—'}</span>}
                    </td>
                  )
                })}
                {actions && <td className="data-table__actions-cell" data-label="Actions">{actions(row)}</td>}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
