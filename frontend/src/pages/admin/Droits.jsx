import { useEffect, useState } from 'react'
import { apiRequest } from '../../auth/api.js'
import { errorMessage } from '../../services/ficheService.js'
import Alert from '../../components/ui/Alert.jsx'
import Icon from '../../components/ui/Icon.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import PageBanner from '../../components/shared/PageBanner.jsx'
import { toast } from '../../utils/toast.js'
import './Droits.css'

const ICONES = {
  DECLARER_FICHE: 'plus',
  VOIR_HISTORIQUE: 'clock',
  COMMENTER: 'comment',
  RELANCER: 'bell',
  METTRE_EN_ATTENTE: 'pause',
}

// Les rôles se rangent par famille ; un rôle nouveau rejoint la famille de son préfixe.
function familleDe(code) {
  if (['AGENT', 'PILOTE'].includes(code)) return 'Terrain'
  if (code === 'DIRECTION') return 'Direction'
  if (code.startsWith('ADMIN')) return 'Administration'
  return 'Validation'
}
const FAMILLES = ['Terrain', 'Validation', 'Direction', 'Administration']

const FIXES = {
  TOUJOURS: { libelle: 'Toujours accordé', aide: 'Indispensable à ce rôle : accordé d’office, non modifiable.', icone: 'lock' },
  SUR_SES_FICHES: { libelle: 'Sur ses fiches', aide: 'Le pilote l’exerce sur les fiches qu’il pilote, non modifiable.', icone: 'user' },
}

/**
 * Droits des rôles : on choisit un rôle à gauche, ses droits s'affichent à droite, un par ligne,
 * avec un interrupteur quand le droit est réglable. Les droits sans objet pour ce rôle sont masqués.
 */
function Droits() {
  const [matrice, setMatrice] = useState(null)
  const [roleId, setRoleId] = useState(null)
  const [error, setError] = useState('')
  const [enCours, setEnCours] = useState('')

  useEffect(() => {
    apiRequest('/admin/permissions')
      .then((result) => setMatrice(result.data))
      .catch((loadError) => setError(loadError.message))
  }, [])

  async function basculer(permission, role, accorde) {
    setEnCours(permission.code)
    setError('')
    try {
      const result = await apiRequest('/admin/permissions', {
        method: 'PUT',
        body: JSON.stringify({ role_id: role.id, permission: permission.code, accorde }),
      })
      setMatrice(result.data)
      toast.success(`« ${permission.libelle} » ${accorde ? 'accordé au rôle' : 'retiré du rôle'} ${role.libelle}.`)
    } catch (saveError) {
      setError(errorMessage(saveError))
    } finally {
      setEnCours('')
    }
  }

  // Un rôle sans aucun droit applicable n'a rien à régler ici.
  const droitsDe = (role) => (matrice?.permissions ?? [])
    .map((permission) => ({ permission, cellule: permission.roles[role.id] }))
    .filter(({ cellule }) => cellule && cellule.etat !== 'NON_APPLICABLE')
  const roles = (matrice?.roles ?? []).filter((role) => droitsDe(role).length > 0)
  const role = roles.find((item) => item.id === roleId) ?? roles[0]
  const accordes = (item) => droitsDe(item).filter(({ cellule }) => cellule.etat !== 'REGLABLE' || cellule.accorde).length

  return (
    <section className="droits-page">
      <PageBanner
        description="Choisissez un rôle pour voir ce qu’il peut faire. Chaque changement est journalisé."
        title="Droits des rôles"
      />
      {error && <Alert severity="error">{error}</Alert>}
      {!matrice ? <Skeleton height={56} lines={6} /> : (
        <div className="droits-layout">
          <nav aria-label="Rôles" className="droits-roles">
            {FAMILLES.map((famille) => {
              const membres = roles.filter((item) => familleDe(item.code) === famille)
              if (!membres.length) return null
              return (
                <div className="droits-roles__famille" key={famille}>
                  <h2>{famille}</h2>
                  {membres.map((item) => (
                    <button
                      aria-current={item.id === role?.id ? 'true' : undefined}
                      className={item.id === role?.id ? 'is-active' : undefined}
                      key={item.id}
                      type="button"
                      onClick={() => setRoleId(item.id)}
                    >
                      <span>{item.libelle}</span>
                      <small>{accordes(item)} / {droitsDe(item).length}</small>
                    </button>
                  ))}
                </div>
              )
            })}
          </nav>

          {role && (
            <article className="droits-detail">
              <header className="droits-detail__entete">
                <h2>{role.libelle}</h2>
                {role.description && <p>{role.description}</p>}
              </header>
              <ul className="droits-liste">
                {droitsDe(role).map(({ permission, cellule }) => (
                  <li className="droits-ligne" key={permission.code}>
                    <span aria-hidden="true" className="droits-ligne__icone"><Icon name={ICONES[permission.code] ?? 'info'} size={18} /></span>
                    <span className="droits-ligne__texte">
                      <strong>{permission.libelle}</strong>
                      {permission.description && <small>{permission.description}</small>}
                    </span>
                    {cellule.etat === 'REGLABLE' ? (
                      <label className={`droits-switch${enCours === permission.code ? ' is-saving' : ''}`}>
                        <span className="droits-switch__etat">{cellule.accorde ? 'Accordé' : 'Non accordé'}</span>
                        <input
                          aria-label={`${permission.libelle} — ${role.libelle}`}
                          checked={cellule.accorde}
                          disabled={enCours !== ''}
                          role="switch"
                          type="checkbox"
                          onChange={(event) => basculer(permission, role, event.target.checked)}
                        />
                        <span aria-hidden="true" className="droits-switch__track"><span className="droits-switch__thumb" /></span>
                      </label>
                    ) : (
                      <span className={`droits-fixe droits-fixe--${cellule.etat === 'TOUJOURS' ? 'toujours' : 'ses-fiches'}`} title={FIXES[cellule.etat]?.aide}>
                        <Icon name={FIXES[cellule.etat]?.icone ?? 'lock'} size={12} />
                        {FIXES[cellule.etat]?.libelle ?? cellule.etat}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {matrice.permissions.length > droitsDe(role).length && (
                <p className="droits-detail__note">
                  Les autres droits ne concernent pas ce rôle.
                </p>
              )}
            </article>
          )}
        </div>
      )}
    </section>
  )
}

export default Droits
