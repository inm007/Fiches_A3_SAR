import AdminEntityPage from '../../components/admin/AdminEntityPage.jsx'
import Badge from '../../components/ui/Badge.jsx'

const related = [{ key: 'units', endpoint: '/admin/units' }]

const fields = [
  { name: 'unite_id', label: 'Unité', type: 'select', optionsKey: 'units' },
  { name: 'code', label: 'Repère (tag)', hint: 'Le repère inscrit sur l’équipement, par exemple « P-204 ».', required: true, maxLength: 255 },
  { name: 'libelle', label: 'Désignation', hint: 'À quoi sert l’équipement, par exemple « Pompe de charge ».', required: true, maxLength: 255 },
  { name: 'reference_sap', label: 'Référence SAP', hint: 'Facultatif.', maxLength: 255 },
]

const columns = [
  {
    key: 'unite',
    label: 'Unité',
    width: '210px',
    value: (equipment) => equipment.unite?.libelle ?? '—',
    render: (equipment) => <span className="data-table__cell-text data-table__unit-name" title={equipment.unite?.libelle ?? '—'}>{equipment.unite?.libelle ?? '—'}</span>,
  },
  { key: 'code', label: 'Repère', width: '17%', titleValue: (equipment) => equipment.code },
  {
    key: 'libelle',
    label: 'Désignation',
    width: '38%',
    titleValue: (equipment) => equipment.libelle,
    render: (equipment) => <span className="data-table__cell-text" title={equipment.libelle}>{equipment.libelle}</span>,
  },
  {
    key: 'reference_sap',
    label: 'Référence SAP',
    detailOnly: true,
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
      detailTitle={(equipment) => `${equipment.code} — ${equipment.libelle}`}
      description="Équipements par unité, avec leur référence SAP."
      endpoint="/admin/equipment"
      fields={fields}
      related={related}
      title="Équipements"
    />
  )
}

export default Equipements
