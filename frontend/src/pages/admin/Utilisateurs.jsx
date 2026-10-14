import { apiRequest } from '../../auth/api.js'
import AdminEntityPage from '../../components/admin/AdminEntityPage.jsx'
import './Utilisateurs.css'

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
]

const columns = [
  { key: 'identifiant', label: 'Identifiant' },
  { key: 'name', label: 'Nom', value: (user) => `${user.prenom} ${user.nom}` },
  { key: 'email', label: 'Courriel' },
  { key: 'auth_source', label: 'Source', value: (user) => user.auth_source === 'ldap' ? 'Annuaire' : 'Locale' },
  { key: 'actif', label: 'Actif', value: (user) => user.actif ? 'Oui' : 'Non' },
  { key: 'derniere_connexion', label: 'Dernière connexion', value: (user) => user.derniere_connexion ? new Date(user.derniere_connexion).toLocaleString('fr-FR') : 'Jamais' },
]

const extraActions = [{
  label: 'Envoyer le lien',
  disabled: (user) => user.auth_source !== 'local' || !user.actif,
  run: async (user) => {
    await apiRequest(`/admin/users/${user.id}/password-link`, { method: 'POST' })
    return 'Lien de définition du mot de passe envoyé.'
  },
}]

function Utilisateurs() {
  return (
    <div className="utilisateurs-page">
      <AdminEntityPage
        columns={columns}
        description="Créez les comptes métier, activez ou désactivez leur accès et envoyez un lien de définition du mot de passe."
        endpoint="/admin/users"
        extraActions={extraActions}
        fields={fields}
        title="Administration des utilisateurs"
      />
    </div>
  )
}

export default Utilisateurs
