import AdminEntityPage from '../../components/admin/AdminEntityPage.jsx'
import Badge from '../../components/ui/Badge.jsx'

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
    render: (unit) => <Badge tone={unit.actif ? 'active' : 'inactive'}>{unit.actif ? 'Actif' : 'Inactif'}</Badge>,
  },
]

const exportColumns = [
  { key: 'code', label: 'Code' },
  { key: 'libelle', label: 'Libellé' },
  { key: 'actif', label: 'Actif', value: (unit) => unit.actif ? 'Oui' : 'Non' },
]

function Unites() {
  return (
    <AdminEntityPage
      columns={columns}
      description="Une unité déjà utilisée se désactive, elle ne se supprime pas."
      endpoint="/admin/units"
      fields={fields}
      title="Unités"
      exportColumns={exportColumns}
    />
  )
}

export default Unites
