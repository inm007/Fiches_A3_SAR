import AdminEntityPage from '../../components/admin/AdminEntityPage.jsx'
import Badge from '../../components/ui/Badge.jsx'

const fields = [
  { name: 'libelle', label: 'Nom de l’unité', hint: 'Tel qu’il apparaîtra sur les fiches, par exemple « Distillation atmosphérique ».', required: true, maxLength: 255 },
  { name: 'code', label: 'Abréviation', hint: 'Forme courte utilisée dans les listes et les exports, par exemple « DA ».', required: true, maxLength: 255 },
]

const columns = [
  { key: 'code', label: 'Abréviation', width: '22%', titleValue: (unit) => unit.code },
  {
    key: 'libelle',
    label: 'Nom de l’unité',
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
