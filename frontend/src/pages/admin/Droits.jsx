import { Fragment, useEffect, useState } from 'react'
import { apiRequest } from '../../auth/api.js'
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

const GROUPES = [
  { titre: 'Terrain', roles: ['AGENT', 'PILOTE'] },
  { titre: 'Validation', roles: ['VALIDEUR_PRODUCTION', 'VALIDEUR_HSE', 'VALIDEUR_PROCEDE', 'VALIDEUR_MAINTENANCE', 'VALIDEUR_INSPECTION', 'CONTROLE_GESTION'] },
  { titre: 'Direction', roles: ['DIRECTION'] },
  { titre: 'Administration', roles: ['ADMIN_FONCTIONNEL'] },
]

const ETATS = {
  TOUJOURS: { libelle: 'Toujours', aide: 'Indispensable à ce rôle : accordé d’office, non modifiable.' },
  SUR_SES_FICHES: { libelle: 'Ses fiches', aide: 'Le pilote l’exerce sur les fiches qu’il pilote, non modifiable.' },
  NON_APPLICABLE: { libelle: 'Sans objet', aide: 'Ce droit ne concerne pas ce rôle.' },
}

// Une case par rôle et par droit : interrupteur quand le droit est réglable, sinon un repère fixe.
function Cellule({ cellule, permission, role, enregistrement, bloque, onBasculer }) {
  if (cellule.etat === 'REGLABLE') {
    const label = `${permission.libelle} — ${role.libelle}`
    return (
      <label className={`droits-switch${enregistrement ? ' is-saving' : ''}`} title={cellule.accorde ? 'Accordé · cliquer pour retirer' : 'Non accordé · cliquer pour accorder'}>
        <input
          aria-label={label}
          checked={cellule.accorde}
          disabled={bloque}
          role="switch"
          type="checkbox"
          onChange={(event) => onBasculer(permission, role, event.target.checked)}
        />
        <span aria-hidden="true" className="droits-switch__track"><span className="droits-switch__thumb" /></span>
      </label>
    )
  }

  const etat = ETATS[cellule.etat]
  if (cellule.etat === 'NON_APPLICABLE') {
    return <span className="droits-fixe droits-fixe--na" title={etat.aide}><span className="sar-sr-only">{etat.libelle}</span>—</span>
  }
  return (
    <span className={`droits-fixe droits-fixe--${cellule.etat === 'TOUJOURS' ? 'toujours' : 'ses-fiches'}`} title={etat.aide}>
      <Icon name={cellule.etat === 'TOUJOURS' ? 'lock' : 'user'} size={12} />
      {etat.libelle}
    </span>
  )
}

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
    setEnCours(`${permission.code}:${role.id}`)
    setError('')
    try {
      const result = await apiRequest('/admin/permissions', {
        method: 'PUT',
        body: JSON.stringify({ role_id: role.id, permission: permission.code, accorde }),
      })
      setMatrice(result.data)
      toast.success(`« ${permission.libelle} » ${accorde ? 'accordé au rôle' : 'retiré du rôle'} ${role.libelle}.`)
    } catch (saveError) {
      setError(Object.values(saveError.data?.errors ?? {}).flat().join(' ') || saveError.message)
    } finally {
      setEnCours('')
    }
  }

  const rolesParCode = Object.fromEntries((matrice?.roles ?? []).map((role) => [role.code, role]))
  const groupes = GROUPES
    .map((groupe) => ({ ...groupe, roles: groupe.roles.map((code) => rolesParCode[code]).filter(Boolean) }))
    .filter((groupe) => groupe.roles.length > 0)
  const nbDroits = matrice?.permissions.length ?? 0

  return (
    <section className="droits-page">
      <PageBanner
        description="Ce que chaque rôle peut faire. Survolez un droit pour sa description. Un changement s’applique tout de suite et il est journalisé."
        title="Droits des rôles"
      />
      {error && <Alert severity="error">{error}</Alert>}
      {!matrice ? <Skeleton height={56} lines={6} /> : (
        <>
          <div className="droits-carte">
            <div className="droits-carte__entete">
              <h2>Droits par rôle</h2>
              <ul className="droits-legende" aria-label="Légende">
                <li><span aria-hidden="true" className="droits-switch droits-switch--demo"><span className="droits-switch__track"><span className="droits-switch__thumb" /></span></span> Réglable</li>
                <li><Cellule cellule={{ etat: 'TOUJOURS' }} /> {ETATS.TOUJOURS.aide}</li>
                <li><Cellule cellule={{ etat: 'SUR_SES_FICHES' }} /> {ETATS.SUR_SES_FICHES.aide}</li>
              </ul>
            </div>
            <div className="droits-carte__defilement">
              <table className="droits-table">
                <thead>
                  <tr>
                    <th scope="col">Rôle</th>
                    {matrice.permissions.map((permission) => (
                      <th key={permission.code} scope="col" title={permission.description}>
                        <span className="droits-table__colonne">
                          <Icon name={ICONES[permission.code] ?? 'info'} size={16} />
                          {permission.libelle}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupes.map((groupe) => (
                    <Fragment key={groupe.titre}>
                      <tr className="droits-table__groupe">
                        <th colSpan={nbDroits + 1} scope="colgroup">{groupe.titre}</th>
                      </tr>
                      {groupe.roles.map((role) => (
                        <tr key={role.id}>
                          <th scope="row">
                            <div className="droits-table__ligne-role">
                              <span className="droits-table__role">
                                <strong>{role.libelle}</strong>
                                {role.description && <span>{role.description}</span>}
                              </span>
                            </div>
                          </th>
                          {matrice.permissions.map((permission) => (
                            <td key={permission.code}>
                              <Cellule
                                cellule={permission.roles[role.id]}
                                bloque={enCours !== ''}
                                enregistrement={enCours === `${permission.code}:${role.id}`}
                                permission={permission}
                                role={role}
                                onBasculer={basculer}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

export default Droits
