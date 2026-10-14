import AdminEntityPage from '../../components/admin/AdminEntityPage.jsx'
import './Affectations.css'

const related = [
  { key: 'users', endpoint: '/admin/users' },
  { key: 'roles', endpoint: '/admin/roles' },
  { key: 'units', endpoint: '/admin/units' },
]

const fields = [
  { name: 'user_id', label: 'Utilisateur', type: 'select', optionsKey: 'users', optionLabel: (user) => `${user.prenom} ${user.nom} — ${user.identifiant}`, required: true },
  { name: 'role_id', label: 'Rôle', type: 'select', optionsKey: 'roles', required: true },
  { name: 'unite_id', label: 'Unité (laisser vide pour un rôle global)', type: 'select', optionsKey: 'units' },
  { name: 'date_debut', label: 'Date de début', type: 'date' },
  { name: 'date_fin', label: 'Date de fin', type: 'date' },
]

const columns = [
  { key: 'user', label: 'Utilisateur', value: (assignment) => assignment.user ? `${assignment.user.prenom} ${assignment.user.nom}` : '—' },
  { key: 'role', label: 'Rôle', value: (assignment) => assignment.role?.libelle },
  { key: 'unite', label: 'Unité', value: (assignment) => assignment.unite?.libelle ?? 'Global' },
  { key: 'date_debut', label: 'Début', value: (assignment) => assignment.date_debut ? String(assignment.date_debut).slice(0, 10) : '—' },
  { key: 'date_fin', label: 'Fin', value: (assignment) => assignment.date_fin ? String(assignment.date_fin).slice(0, 10) : '—' },
  { key: 'actif', label: 'Actif', value: (assignment) => assignment.actif ? 'Oui' : 'Non' },
]

function Affectations() {
  return (
    <div className="affectations-page">
      <AdminEntityPage
        columns={columns}
        description="Gérez les rôles et périmètres des comptes. Un utilisateur peut cumuler plusieurs affectations."
        endpoint="/admin/assignments"
        fields={fields}
        related={related}
        title="Affectations"
      />
    </div>
  )
}

export default Affectations
