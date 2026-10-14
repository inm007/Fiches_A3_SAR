import AdminEntityPage from '../../components/admin/AdminEntityPage.jsx'
import './Equipements.css'

const related = [{ key: 'units', endpoint: '/admin/units' }]

const fields = [
  { name: 'unite_id', label: 'Unité', type: 'select', optionsKey: 'units' },
  { name: 'code', label: 'Code', required: true, maxLength: 255 },
  { name: 'libelle', label: 'Libellé', required: true, maxLength: 255 },
  { name: 'reference_sap', label: 'Référence SAP', maxLength: 255 },
]

const columns = [
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
        fields={fields}
        related={related}
        title="Équipements"
      />
    </div>
  )
}

export default Equipements
