import AdminEntityPage from '../../components/admin/AdminEntityPage.jsx'
import Badge from '../../components/ui/Badge.jsx'

const related = [{ key: 'units', endpoint: '/admin/units' }]

const fields = [
  { name: 'unite_id', label: 'Unité', type: 'select', optionsKey: 'units' },
  { name: 'code', label: 'Code', required: true, maxLength: 255 },
  { name: 'libelle', label: 'Libellé', required: true, maxLength: 255 },
  { name: 'reference_sap', label: 'Référence SAP', maxLength: 255 },
]

const columns = [
  {
    key: 'unite',
    label: 'Unité',
    width: '210px',
    value: (equipment) => equipment.unite?.libelle ?? '—',
    render: (equipment) => <span className="data-table__cell-text data-table__unit-name" title={equipment.unite?.libelle ?? '—'}>{equipment.unite?.libelle ?? '—'}</span>,
  },
  { key: 'code', label: 'Code', width: '17%', titleValue: (equipment) => equipment.code },
  {
    key: 'libelle',
    label: 'Libellé',
    width: '28%',
    titleValue: (equipment) => equipment.libelle,
    render: (equipment) => <span className="data-table__cell-text" title={equipment.libelle}>{equipment.libelle}</span>,
  },
  {
    key: 'reference_sap',
    label: 'Référence SAP',
    width: '20%',
    titleValue: (equipment) => equipment.reference_sap,
    render: (equipment) => <span className="data-table__cell-text" title={equipment.reference_sap}>{equipment.reference_sap ?? '—'}</span>,
  },
  {
    key: 'actif',
    label: 'État',
    width: '15%',
    value: (equipment) => equipment.actif ? 'Actif' : 'Inactif',
    render: (equipment) => <Badge tone={equipment.actif ? 'active' : 'inactive'}>{equipment.actif ? 'Actif' : 'Inactif'}</Badge>,
  },
]

function Equipements() {
  return (
    <AdminEntityPage
      columns={columns}
      description="Équipements par unité, avec leur référence SAP."
      endpoint="/admin/equipment"
      fields={fields}
      related={related}
      title="Équipements"
    />
  )
}

export default Equipements
