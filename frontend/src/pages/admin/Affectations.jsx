import AdminEntityPage from '../../components/admin/AdminEntityPage.jsx'
import Badge from '../../components/common/Badge.jsx'
import { formatDate } from '../../utils/format.js'
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
  {
    key: 'user',
    label: 'Utilisateur',
    width: '24%',
    value: (assignment) => assignment.user ? `${assignment.user.prenom} ${assignment.user.nom}` : '—',
    render: (assignment) => {
      const name = assignment.user ? `${assignment.user.prenom} ${assignment.user.nom}` : '—'
      return <span className="data-table__cell-text" title={name}>{name}</span>
    },
  },
  {
    key: 'role',
    label: 'Rôle',
    width: '17%',
    value: (assignment) => assignment.role?.libelle ?? '—',
    render: (assignment) => <span className="data-table__cell-text" title={assignment.role?.libelle ?? '—'}>{assignment.role?.libelle ?? '—'}</span>,
  },
  {
    key: 'unite',
    label: 'Unité',
    width: '230px',
    value: (assignment) => assignment.unite?.libelle ?? 'Global',
    render: (assignment) => <span className="data-table__cell-text data-table__unit-name" title={assignment.unite?.libelle ?? 'Global'}>{assignment.unite?.libelle ?? 'Global'}</span>,
  },
  {
    key: 'date_debut',
    label: 'Début',
    width: '13%',
    value: (assignment) => assignment.date_debut ? formatDate(assignment.date_debut) : '—',
    render: (assignment) => formatDate(assignment.date_debut),
  },
  {
    key: 'date_fin',
    label: 'Fin',
    width: '13%',
    filterable: false,
    value: (assignment) => assignment.date_fin ? formatDate(assignment.date_fin) : '—',
    render: (assignment) => formatDate(assignment.date_fin),
  },
  {
    key: 'actif',
    label: 'État',
    width: '15%',
    value: (assignment) => assignment.actif ? 'Actif' : 'Inactif',
    render: (assignment) => <Badge tone={assignment.actif ? 'success' : 'muted'}>{assignment.actif ? 'Actif' : 'Inactif'}</Badge>,
  },
]

const exportColumns = [
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
        exportColumns={exportColumns}
        fields={fields}
        related={related}
        title="Affectations"
        compactTable
      />
    </div>
  )
}

export default Affectations
