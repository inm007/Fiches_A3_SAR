import { useEffect, useState } from 'react'
import { apiRequest } from '../../auth/api.js'
import Alert from '../../components/ui/Alert.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import PageBanner from '../../components/shared/PageBanner.jsx'
import { toast } from '../../utils/toast.js'
import './Droits.css'

// Matrice rôles × droits réglables. Une case grisée correspond à un droit verrouillé pour ce rôle (PRD §2.3).
function Droits() {
  const [matrice, setMatrice] = useState(null)
  const [error, setError] = useState('')
  const [enCours, setEnCours] = useState('')

  useEffect(() => {
    apiRequest('/admin/permissions')
      .then((result) => setMatrice(result.data))
      .catch((loadError) => setError(loadError.message))
  }, [])

  async function basculer(permission, role, accorde) {
    const cle = `${permission.code}:${role.id}`
    setEnCours(cle)
    setError('')
    try {
      const result = await apiRequest('/admin/permissions', {
        method: 'PUT',
        body: JSON.stringify({ role_id: role.id, permission: permission.code, accorde }),
      })
      setMatrice(result.data)
      toast.success(`${permission.libelle} : ${accorde ? 'accordé à' : 'retiré à'} ${role.libelle}.`)
    } catch (saveError) {
      setError(Object.values(saveError.data?.errors ?? {}).flat().join(' ') || saveError.message)
    } finally {
      setEnCours('')
    }
  }

  // Les administrateurs techniques n'ont aucun droit réglable : leur colonne serait vide.
  const roles = (matrice?.roles ?? []).filter((role) => matrice.permissions.some((permission) => permission.roles_eligibles.includes(role.id)))

  return (
    <section className="droits-page">
      <PageBanner
        description="Accordez ou retirez des droits à chaque rôle. Les changements s’appliquent dès la prochaine action des utilisateurs concernés."
        title="Droits des rôles"
      />
      <Alert severity="info">
        Le circuit de validation, la visibilité des fiches, la confidentialité et l’administration restent fixés par le PRD.
        Le pilote désigné d’une fiche garde toujours ses droits sur sa fiche. Chaque changement est inscrit au journal d’administration.
      </Alert>
      {error && <Alert severity="error">{error}</Alert>}
      {!matrice ? <Skeleton height={44} lines={6} /> : (
        <div className="droits-page__table-wrap">
          <table className="droits-page__table">
            <thead>
              <tr>
                <th scope="col">Droit</th>
                {roles.map((role) => <th key={role.id} scope="col">{role.libelle}</th>)}
              </tr>
            </thead>
            <tbody>
              {matrice.permissions.map((permission) => (
                <tr key={permission.code}>
                  <th scope="row">
                    <strong>{permission.libelle}</strong>
                    <span>{permission.description}</span>
                  </th>
                  {roles.map((role) => {
                    const eligible = permission.roles_eligibles.includes(role.id)
                    const accorde = permission.roles_accordes.includes(role.id)
                    const parDefaut = permission.roles_par_defaut.includes(role.id)
                    const cle = `${permission.code}:${role.id}`
                    return (
                      <td className={eligible && accorde !== parDefaut ? 'is-modifie' : undefined} key={role.id}>
                        <input
                          aria-label={`${permission.libelle} — ${role.libelle}`}
                          checked={accorde}
                          disabled={!eligible || enCours !== ''}
                          title={eligible ? (accorde !== parDefaut ? 'Modifié par rapport au PRD' : undefined) : 'Droit verrouillé pour ce rôle'}
                          type="checkbox"
                          onChange={(event) => basculer(permission, role, event.target.checked)}
                        />
                        {enCours === cle && <span className="droits-page__saving" aria-live="polite">…</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {matrice && <p className="droits-page__legende"><span className="droits-page__pastille" /> Case différente de la matrice du PRD.</p>}
    </section>
  )
}

export default Droits
