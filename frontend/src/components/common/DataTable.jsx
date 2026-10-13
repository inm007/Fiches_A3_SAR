import EmptyState from './EmptyState.jsx'
import './DataTable.css'

function DataTable({ columns = [], rows = [], emptyMessage = 'Aucun résultat.' }) {
  if (!rows.length) return <EmptyState title={emptyMessage} />

  return (
    <div className="data-table__scroll">
      <table className="data-table">
        <thead>
          <tr>{columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id ?? index}>
              {columns.map((column) => <td key={column.key}>{row[column.key] ?? '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
