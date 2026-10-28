import { useSearchParams } from 'react-router-dom'
import AdminEntityPage from '../../components/admin/AdminEntityPage.jsx'
import Badge from '../../components/ui/Badge.jsx'
import { formatDate, personName } from '../../utils/format.js'

const related = [
  { key: 'users', endpoint: '/admin/users' },
  { key: 'roles', endpoint: '/admin/roles' },
  { key: 'units', endpoint: '/admin/units' },
]

const fields = [
  { name: 'user_id', label: 'Utilisateur', type: 'select', optionsKey: 'users', optionLabel: (user) => `${personName(user)} — ${user.identifiant}`, required: true },
  { name: 'role_id', label: 'Rôle', type: 'select', optionsKey: 'roles', required: true },
  { name: 'unite_id', label: 'Unité (laisser vide pour un rôle global)', type: 'select', optionsKey: 'units' },
  { name: 'date_debut', label: 'Date de début', type: 'date' },
  { name: 'date_fin', label: 'Date de fin', type: 'date' },
]

// Une seule colonne pour les dates : « Depuis le … », « Jusqu’au … » ou « Du … au … ».
function periode(assignment) {
  const { date_debut: debut, date_fin: fin } = assignment
  if (debut && fin) return `Du ${formatDate(debut)} au ${formatDate(fin)}`
  if (fin) return `Jusqu’au ${formatDate(fin)}`
  if (debut) return `Depuis le ${formatDate(debut)}`
  return 'Sans limite'
}

const columns = [
  {
    key: 'user',
    label: 'Utilisateur',
    width: '24%',
    value: (assignment) => personName(assignment.user) ?? '—',
    render: (assignment) => {
      const name = personName(assignment.user) ?? '—'
      return <span className="data-table__cell-text" title={name}>{name}</span>
    },
  },
  {
    key: 'role',
    label: 'Rôle',
    width: '22%',
    value: (assignment) => assignment.role?.libelle ?? '—',
    render: (assignment) => <span className="data-table__cell-text" title={assignment.role?.libelle ?? '—'}>{assignment.role?.libelle ?? '—'}</span>,
  },
  {
    key: 'unite',
    label: 'Unité',
    width: '22%',
    value: (assignment) => assignment.unite?.libelle ?? 'Global',
    render: (assignment) => <span className="data-table__cell-text data-table__unit-name" title={assignment.unite?.libelle ?? 'Global'}>{assignment.unite?.libelle ?? 'Global'}</span>,
  },
  {
    key: 'date_debut',
    label: 'Début',
    detailOnly: true,
    value: (assignment) => assignment.date_debut ? formatDate(assignment.date_debut) : '—',
    render: (assignment) => formatDate(assignment.date_debut),
  },
  {
    key: 'date_fin',
    label: 'Fin',
    detailOnly: true,
    value: (assignment) => assignment.date_fin ? formatDate(assignment.date_fin) : '—',
    render: (assignment) => formatDate(assignment.date_fin),
  },
  {
    key: 'periode',
    label: 'Période',
    width: '20%',
    hideInDetails: true,
    value: (assignment) => periode(assignment),
  },
  {
    key: 'actif',
    label: 'État',
    width: '12%',
    value: (assignment) => assignment.actif ? 'Actif' : 'Inactif',
    render: (assignment) => <Badge tone={assignment.actif ? 'active' : 'inactive'}>{assignment.actif ? 'Actif' : 'Inactif'}</Badge>,
  },
]

const exportColumns = [
  { key: 'user', label: 'Utilisateur', value: (assignment) => personName(assignment.user) ?? '—' },
  { key: 'role', label: 'Rôle', value: (assignment) => assignment.role?.libelle },
  { key: 'unite', label: 'Unité', value: (assignment) => assignment.unite?.libelle ?? 'Global' },
  { key: 'date_debut', label: 'Début', value: (assignment) => assignment.date_debut ? String(assignment.date_debut).slice(0, 10) : '—' },
  { key: 'date_fin', label: 'Fin', value: (assignment) => assignment.date_fin ? String(assignment.date_fin).slice(0, 10) : '—' },
  { key: 'actif', label: 'Actif', value: (assignment) => assignment.actif ? 'Oui' : 'Non' },
]

function Affectations() {
  const userId = useSearchParams()[0].get('user_id')
  return (
    <AdminEntityPage
      createWith={userId ? { user_id: userId } : undefined}
      columns={columns}
      detailTitle={(assignment) => `${personName(assignment.user) ?? '—'} — ${assignment.role?.libelle ?? ''}`}
      description="Un rôle par ligne, sur une unité ou global. Une personne peut en cumuler plusieurs."
      endpoint="/admin/assignments"
      exportColumns={exportColumns}
      fields={fields}
      related={related}
      messages={{ add: 'Donner un rôle', createTitle: () => 'Donner un rôle', created: 'Rôle donné.' }}
      title="Affectations"
    />
  )
}

export default Affectations
