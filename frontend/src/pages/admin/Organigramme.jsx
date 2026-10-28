import AdminEntityPage from '../../components/admin/AdminEntityPage.jsx'
import Badge from '../../components/ui/Badge.jsx'
import { TYPES_ENTITE } from '../../utils/constants.js'
import { personName } from '../../utils/format.js'

const typeLabel = (type) => TYPES_ENTITE.find(([code]) => code === type)?.[1] ?? type

const related = [
  { key: 'entities', endpoint: '/admin/entities' },
  { key: 'users', endpoint: '/admin/users' },
]

const fields = [
  { name: 'type', label: 'Type', type: 'select', required: true, defaultValue: 'DEPARTEMENT', options: TYPES_ENTITE.map(([value, label]) => ({ value, label })) },
  { name: 'libelle', label: 'Nom de l’entité', hint: 'Par exemple « Direction Production » ou « Département Fabrication ».', required: true, maxLength: 255 },
  { name: 'code', label: 'Abréviation', hint: 'Forme courte, par exemple « DPROD ».', required: true, maxLength: 255 },
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
    optionLabel: personName,
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
  { key: 'libelle', label: 'Nom', width: '26%', render: (entite) => <span className="data-table__cell-text" title={entite.libelle}>{entite.libelle}</span> },
  { key: 'parent', label: 'Rattachée à', width: '22%', value: (entite) => entite.parent ?? '—', render: (entite) => <span className="data-table__cell-text" title={entite.parent ?? ''}>{entite.parent ?? '—'}</span> },
  { key: 'responsable', label: 'Responsable', width: '20%', render: (entite) => entite.responsable ?? <span className="admin-entity__never">Non désigné</span> },
  { key: 'membres_count', label: 'Personnes', width: '9%' },
  {
    key: 'actif',
    label: 'État',
    width: '9%',
    value: (entite) => entite.actif ? 'Actif' : 'Inactif',
    render: (entite) => <Badge tone={entite.actif ? 'active' : 'inactive'}>{entite.actif ? 'Actif' : 'Inactif'}</Badge>,
  },
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
      fields={fields}
      related={related}
      title="Organigramme"
    />
  )
}

export default Organigramme
