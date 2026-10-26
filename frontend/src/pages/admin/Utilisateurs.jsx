import { apiRequest } from '../../auth/api.js'
import AdminEntityPage from '../../components/admin/AdminEntityPage.jsx'
import Badge from '../../components/ui/Badge.jsx'

const fields = [
  { name: 'identifiant', label: 'Identifiant', required: true, maxLength: 255 },
  { name: 'email', label: 'Courriel', type: 'email', required: true, maxLength: 255 },
  { name: 'nom', label: 'Nom', required: true, maxLength: 255 },
  { name: 'prenom', label: 'Prénom', required: true, maxLength: 255 },
  { name: 'auth_source', label: 'Source', type: 'select', required: true, defaultValue: 'local', options: [
    { value: 'local', label: 'Locale' },
    { value: 'ldap', label: 'Annuaire' },
  ] },
  { name: 'ldap_dn', label: 'Identifiant annuaire (DN LDAP)', maxLength: 255, showWhen: (values) => values.auth_source === 'ldap' },
  {
    name: 'entite_id',
    label: 'Entité de rattachement',
    type: 'select',
    optionsKey: 'entities',
    hint: 'Direction, département ou service (écran Organigramme). Ses fiches partent en validation de pertinence chez le chef de son département.',
  },
]

const related = [{ key: 'entities', endpoint: '/admin/entities' }]

function formatFrenchDateTime(value) {
  if (!value) return 'Jamais'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const withTime = String(value).includes('T') || String(value).includes(':')
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  }).format(date).replace(',', '')
}

function userInitials(user) {
  return `${user.prenom?.trim().charAt(0) ?? ''}${user.nom?.trim().charAt(0) ?? ''}`.toLocaleUpperCase('fr') || '?'
}

const columns = [
  {
    key: 'name',
    label: 'Utilisateur',
    width: '26%',
    searchValue: (user) => `${user.prenom} ${user.nom} ${user.identifiant}`,
    render: (user) => (
      <div className="admin-entity__user">
        <span aria-hidden="true" className="admin-entity__avatar">{userInitials(user)}</span>
        <span className="admin-entity__user-details">
          <strong title={`${user.prenom} ${user.nom} · ${user.identifiant} · ${user.email} · ${user.auth_source === 'ldap' ? 'Annuaire' : 'Locale'}`}>
            {user.prenom} {user.nom}
          </strong>
          <small title={user.identifiant}>{user.identifiant}</small>
        </span>
      </div>
    ),
  },
  { key: 'email', label: 'Courriel', width: '20%', className: 'data-table__secondary-column', filterable: false, titleValue: (user) => user.email },
  {
    key: 'entite',
    label: 'Entité',
    width: '15%',
    value: (user) => user.entite ?? 'Non rattaché',
    render: (user) => user.entite
      ? <span className="data-table__cell-text" title={user.entite}>{user.entite}</span>
      : <span className="admin-entity__never">Non rattaché</span>,
  },
  {
    key: 'auth_source',
    label: 'Source',
    width: '10%',
    className: 'data-table__secondary-column',
    value: (user) => user.auth_source === 'ldap' ? 'Annuaire' : 'Locale',
    render: (user) => <Badge>{user.auth_source === 'ldap' ? 'Annuaire' : 'Locale'}</Badge>,
  },
  {
    key: 'actif',
    label: 'État',
    width: '10%',
    value: (user) => user.actif ? 'Actif' : 'Inactif',
    render: (user) => <Badge tone={user.actif ? 'active' : 'inactive'}>{user.actif ? 'Actif' : 'Inactif'}</Badge>,
  },
  {
    key: 'derniere_connexion',
    label: 'Dernière connexion',
    width: '19%',
    className: 'data-table__date-column',
    value: (user) => formatFrenchDateTime(user.derniere_connexion),
    render: (user) => user.derniere_connexion
      ? <time dateTime={user.derniere_connexion}>{formatFrenchDateTime(user.derniere_connexion)}</time>
      : <span className="admin-entity__never">Jamais</span>,
  },
]

const exportColumns = [
  { key: 'identifiant', label: 'Identifiant' },
  { key: 'name', label: 'Nom', value: (user) => `${user.prenom} ${user.nom}` },
  { key: 'email', label: 'Courriel' },
  { key: 'entite', label: 'Entité', value: (user) => user.entite ?? '' },
  { key: 'auth_source', label: 'Source', value: (user) => user.auth_source === 'ldap' ? 'Annuaire' : 'Locale' },
  { key: 'actif', label: 'Actif', value: (user) => user.actif ? 'Oui' : 'Non' },
  { key: 'derniere_connexion', label: 'Dernière connexion', value: (user) => user.derniere_connexion ? new Date(user.derniere_connexion).toLocaleString('fr-FR') : 'Jamais' },
]

const extraActions = [{
  label: 'Envoyer le lien',
  icon: 'mail',
  disabled: (user) => user.auth_source !== 'local' || !user.actif,
  run: async (user) => {
    await apiRequest(`/admin/users/${user.id}/password-link`, { method: 'POST' })
    return 'Lien de définition du mot de passe envoyé.'
  },
}]

function Utilisateurs() {
  return (
    <AdminEntityPage
      columns={columns}
      description="Un nouveau compte reçoit par courriel son lien pour choisir son mot de passe."
      endpoint="/admin/users"
      exportColumns={exportColumns}
      extraActions={extraActions}
      fields={fields}
      related={related}
      messages={{ created: (user) => (user?.lien_envoye ? 'Compte créé : le lien de définition du mot de passe est envoyé.' : 'Compte créé.') }}
      title="Utilisateurs"
    />
  )
}

export default Utilisateurs
