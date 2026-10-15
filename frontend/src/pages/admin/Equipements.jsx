import AdminEntityPage from '../../components/admin/AdminEntityPage.jsx'
import Badge from '../../components/common/Badge.jsx'
import './Equipements.css'

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
    width: '20%',
    value: (equipment) => equipment.unite?.libelle ?? '—',
    render: (equipment) => <span className="data-table__cell-text" title={equipment.unite?.libelle ?? '—'}>{equipment.unite?.libelle ?? '—'}</span>,
  },
  { key: 'code', label: 'Code', width: '17%', filterable: false, titleValue: (equipment) => equipment.code },
  {
    key: 'libelle',
    label: 'Libellé',
    width: '28%',
    filterable: false,
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
    render: (equipment) => <Badge tone={equipment.actif ? 'success' : 'muted'}>{equipment.actif ? 'Actif' : 'Inactif'}</Badge>,
  },
]

const exportColumns = [
  { key: 'unite', label: 'Unité', value: (equipment) => equipment.unite?.libelle ?? '—' },
  { key: 'code', label: 'Code' },
  { key: 'libelle', label: 'Libellé' },
  { key: 'reference_sap', label: 'Référence SAP' },
  { key: 'actif', label: 'Actif', value: (equipment) => equipment.actif ? 'Oui' : 'Non' },
]

function Equipements() {
  return (
    <div className="equipements-page">
      <AdminEntityPage
        columns={columns}
        description="Maintenez les équipements par unité et leur référence SAP."
        endpoint="/admin/equipment"
        exportColumns={exportColumns}
        fields={fields}
        related={related}
        title="Équipements"
        compactTable
      />
    </div>
  )
}

export default Equipements
