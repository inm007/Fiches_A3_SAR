import AdminEntityPage from '../../components/admin/AdminEntityPage.jsx'
import Badge from '../../components/ui/Badge.jsx'

const fields = [
  { name: 'code', label: 'Code', required: true, maxLength: 255 },
  { name: 'libelle', label: 'Libellé', required: true, maxLength: 255 },
]

const columns = [
  { key: 'code', label: 'Code', width: '22%', titleValue: (unit) => unit.code },
  {
    key: 'libelle',
    label: 'Libellé',
    width: '48%',
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

function Unites() {
  return (
    <AdminEntityPage
      columns={columns}
      description="Une unité déjà utilisée se désactive, elle n’est jamais supprimée."
      endpoint="/admin/units"
      fields={fields}
      title="Unités"
    />
  )
}

export default Unites
