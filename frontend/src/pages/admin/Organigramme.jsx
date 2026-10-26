import AdminEntityPage from '../../components/admin/AdminEntityPage.jsx'
import Badge from '../../components/ui/Badge.jsx'
import { TYPES_ENTITE } from '../../utils/constants.js'

const typeLabel = (type) => TYPES_ENTITE.find(([code]) => code === type)?.[1] ?? type

const related = [
  { key: 'entities', endpoint: '/admin/entities' },
  { key: 'users', endpoint: '/admin/users' },
]

const fields = [
  { name: 'type', label: 'Type', type: 'select', required: true, defaultValue: 'DEPARTEMENT', options: TYPES_ENTITE.map(([value, label]) => ({ value, label })) },
  { name: 'code', label: 'Code', required: true, maxLength: 255 },
  { name: 'libelle', label: 'Libellé', required: true, maxLength: 255 },
  {
    name: 'parent_id',
    label: 'Rattachée à',
    type: 'select',
    optionsKey: 'entities',
    hint: 'Un département se rattache à une direction, un service à un département.',
    showWhen: (values) => values.type !== 'DIRECTION',
    optionLabel: (entite) => `${typeLabel(entite.type)} — ${entite.libelle}`,
  },
  {
    name: 'responsable_id',
    label: 'Responsable',
    type: 'select',
    optionsKey: 'users',
    hint: 'Le responsable d’un département reçoit le profil Chef de département : il valide la pertinence des fiches de son département.',
    optionLabel: (user) => `${user.prenom} ${user.nom}`,
  },
]

const columns = [
  {
    key: 'type',
    label: 'Type',
    width: '14%',
    value: (entite) => typeLabel(entite.type),
    render: (entite) => <Badge>{typeLabel(entite.type)}</Badge>,
  },
  { key: 'libelle', label: 'Libellé', width: '26%', filterable: false, render: (entite) => <span className="data-table__cell-text" title={entite.libelle}>{entite.libelle}</span> },
  { key: 'parent', label: 'Rattachée à', width: '22%', value: (entite) => entite.parent ?? '—', render: (entite) => <span className="data-table__cell-text" title={entite.parent ?? ''}>{entite.parent ?? '—'}</span> },
  { key: 'responsable', label: 'Responsable', width: '20%', filterable: false, render: (entite) => entite.responsable ?? <span className="admin-entity__never">Non désigné</span> },
  { key: 'membres_count', label: 'Personnes', width: '9%', filterable: false },
  {
    key: 'actif',
    label: 'État',
    width: '9%',
    value: (entite) => entite.actif ? 'Actif' : 'Inactif',
    render: (entite) => <Badge tone={entite.actif ? 'active' : 'inactive'}>{entite.actif ? 'Actif' : 'Inactif'}</Badge>,
  },
]

const exportColumns = [
  { key: 'type', label: 'Type', value: (entite) => typeLabel(entite.type) },
  { key: 'code', label: 'Code' },
  { key: 'libelle', label: 'Libellé' },
  { key: 'parent', label: 'Rattachée à', value: (entite) => entite.parent ?? '' },
  { key: 'responsable', label: 'Responsable', value: (entite) => entite.responsable ?? '' },
  { key: 'membres_count', label: 'Personnes rattachées' },
  { key: 'actif', label: 'Actif', value: (entite) => entite.actif ? 'Oui' : 'Non' },
]

/**
 * Organigramme : directions, départements et services. Chaque utilisateur est rattaché à
 * une entité (écran Utilisateurs) ; sa fiche part en validation de pertinence chez le
 * responsable de son département.
 */
function Organigramme() {
  return (
    <AdminEntityPage
      columns={columns}
      description="Le responsable d’un département valide la pertinence des fiches de son département."
      endpoint="/admin/entities"
      exportColumns={exportColumns}
      fields={fields}
      related={related}
      title="Organigramme"
    />
  )
}

export default Organigramme
