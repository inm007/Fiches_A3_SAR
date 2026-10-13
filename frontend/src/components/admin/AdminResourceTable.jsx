import DataTable from '../common/DataTable.jsx'
import FilterBar from '../common/FilterBar.jsx'
import './AdminResourceTable.css'

function AdminResourceTable({ columns = [], rows = [] }) {
  return (
    <section className="admin-resource">
      <FilterBar />
      <DataTable columns={columns} rows={rows} emptyMessage="Aucun élément dans ce référentiel." />
    </section>
  )
}

export default AdminResourceTable
