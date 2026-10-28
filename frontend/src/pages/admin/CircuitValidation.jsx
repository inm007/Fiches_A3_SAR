import { useEffect, useState } from 'react'
import { apiRequest } from '../../auth/api.js'
import { errorMessage } from '../../services/ficheService.js'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import PageBanner from '../../components/shared/PageBanner.jsx'
import { toast } from '../../utils/toast.js'
import './CircuitValidation.css'

const signature = (domaines) => JSON.stringify(domaines.map(({ domaine, roles }) => [domaine, [...roles].sort()]))

/**
 * Circuit de validation du plan (porte 1) : une ligne par domaine coché en section 7,
 * avec les directeurs sollicités en même temps. Tous doivent approuver le plan.
 */
function CircuitValidation() {
  const [etat, setEtat] = useState(null)
  const [enregistre, setEnregistre] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiRequest('/admin/circuit')
      .then((result) => { setEtat(result.data); setEnregistre(signature(result.data.domaines)) })
      .catch((loadError) => setError(loadError.message))
  }, [])

  const libelleDe = (code) => etat.directeurs.find((directeur) => directeur.code === code)?.libelle ?? code
  const modifie = Boolean(etat) && signature(etat.domaines) !== enregistre

  function changer(domaine, roles) {
    setEtat((current) => ({
      ...current,
      domaines: current.domaines.map((ligne) => (ligne.domaine === domaine ? { ...ligne, roles } : ligne)),
    }))
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const result = await apiRequest('/admin/circuit', {
        method: 'PUT',
        body: JSON.stringify({ domaines: etat.domaines.map(({ domaine, roles }) => ({ domaine, roles })) }),
      })
      setEtat(result.data)
      setEnregistre(signature(result.data.domaines))
      toast.success('Circuit de validation enregistré.')
    } catch (saveError) {
      setError(errorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="circuit-page">
      <PageBanner
        description="Pour chaque domaine coché en section 7, qui valide le plan d’actions. Les directeurs d’un domaine reçoivent le plan en même temps et tous doivent l’approuver."
        title="Circuit de validation"
      />
      {error && <Alert severity="error">{error}</Alert>}
      {!etat ? (!error && <Skeleton height={56} lines={6} />) : (
        <>
          <div className="circuit-carte">
            <div className="circuit-carte__entete" aria-hidden="true">
              <span>Domaine</span>
              <span>Directeurs qui valident le plan</span>
            </div>
            <ul className="circuit-liste">
              {etat.domaines.map((ligne) => (
                <li className="circuit-ligne" key={ligne.domaine}>
                  <strong className="circuit-ligne__domaine">{ligne.libelle}</strong>
                  {ligne.choisi_sur_la_fiche
                    ? <p className="circuit-ligne__info"><Icon name="info" size={15} />Le pilote précise le domaine et choisit le directeur sur la fiche.</p>
                    : (
                      <div className="circuit-ligne__valideurs">
                        {ligne.roles.length === 0 && <span className="circuit-ligne__vide">Aucun directeur</span>}
                        {ligne.roles.map((code) => (
                          <span className="circuit-puce" key={code}>
                            {libelleDe(code)}
                            <button
                              aria-label={`Retirer ${libelleDe(code)} du domaine ${ligne.libelle}`}
                              disabled={saving}
                              title="Retirer"
                              type="button"
                              onClick={() => changer(ligne.domaine, ligne.roles.filter((role) => role !== code))}
                            >
                              <Icon name="x" size={13} />
                            </button>
                          </span>
                        ))}
                        <AjouterDirecteur
                          disabled={saving}
                          domaine={ligne.libelle}
                          options={etat.directeurs.filter((directeur) => !ligne.roles.includes(directeur.code))}
                          onAjouter={(code) => changer(ligne.domaine, [...ligne.roles, code])}
                        />
                      </div>
                    )}
                </li>
              ))}
            </ul>
          </div>
          <div className={`circuit-barre${modifie ? ' is-dirty' : ''}`}>
            <span>{modifie ? 'Modifications non enregistrées.' : 'Circuit à jour.'}</span>
            <Button disabled={!modifie} loading={saving} loadingLabel="Enregistrement…" type="button" onClick={save}>Enregistrer le circuit</Button>
          </div>
        </>
      )}
    </section>
  )
}

// « + Ajouter » : une liste déroulante des directeurs pas encore sollicités sur ce domaine.
function AjouterDirecteur({ domaine, options, disabled, onAjouter }) {
  if (!options.length) return null
  return (
    <label className="circuit-ajout">
      <span className="sar-sr-only">Ajouter un directeur au domaine {domaine}</span>
      <Icon name="plus" size={14} />
      <select
        disabled={disabled}
        value=""
        onChange={(event) => { if (event.target.value) onAjouter(event.target.value) }}
      >
        <option value="">Ajouter</option>
        {options.map((directeur) => <option key={directeur.code} value={directeur.code}>{directeur.libelle}</option>)}
      </select>
    </label>
  )
}

export default CircuitValidation
