import AdminEntityPage from '../../components/admin/AdminEntityPage.jsx'
import Badge from '../../components/common/Badge.jsx'
import './Unites.css'

const fields = [
  { name: 'code', label: 'Code', required: true, maxLength: 255 },
  { name: 'libelle', label: 'Libellé', required: true, maxLength: 255 },
]

const columns = [
  { key: 'code', label: 'Code', width: '22%', filterable: false, titleValue: (unit) => unit.code },
  {
    key: 'libelle',
    label: 'Libellé',
    width: '48%',
    filterable: false,
    render: (unit) => <span className="data-table__cell-text" title={unit.libelle}>{unit.libelle}</span>,
  },
  {
    key: 'actif',
    label: 'État',
    width: '16%',
    value: (unit) => unit.actif ? 'Actif' : 'Inactif',
    render: (unit) => <Badge tone={unit.actif ? 'success' : 'muted'}>{unit.actif ? 'Actif' : 'Inactif'}</Badge>,
  },
]

const exportColumns = [
  { key: 'code', label: 'Code' },
  { key: 'libelle', label: 'Libellé' },
  { key: 'actif', label: 'Actif', value: (unit) => unit.actif ? 'Oui' : 'Non' },
]

function Unites() {
  return (
    <div className="unites-page">
      <AdminEntityPage
        columns={columns}
        description="Gérez le référentiel des unités. Les unités utilisées dans l’historique sont désactivées, jamais supprimées."
        endpoint="/admin/units"
        fields={fields}
        title="Unités"
        exportColumns={exportColumns}
        compactTable
      />
    </div>
  )
}

export default Unites
