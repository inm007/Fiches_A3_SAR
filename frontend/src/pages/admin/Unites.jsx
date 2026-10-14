import AdminEntityPage from '../../components/admin/AdminEntityPage.jsx'
import './Unites.css'

const fields = [
  { name: 'code', label: 'Code', required: true, maxLength: 255 },
  { name: 'libelle', label: 'Libellé', required: true, maxLength: 255 },
]

const columns = [
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
      />
    </div>
  )
}

export default Unites
