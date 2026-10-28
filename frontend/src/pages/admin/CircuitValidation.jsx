import { useEffect, useState } from 'react'
import { apiRequest } from '../../auth/api.js'
import { errorMessage } from '../../services/ficheService.js'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import { Checkbox } from '../../components/ui/FormControls.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import PageBanner from '../../components/shared/PageBanner.jsx'
import { toast } from '../../utils/toast.js'
import './ParametresFonctionnels.css'

/**
 * Circuit de validation du plan (porte 1) : pour chaque domaine coché en section 7,
 * les directeurs sollicités en même temps. Tous doivent approuver le plan.
 */
function CircuitValidation() {
  const [etat, setEtat] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiRequest('/admin/circuit')
      .then((result) => setEtat(result.data))
      .catch((loadError) => setError(loadError.message))
  }, [])

  function basculer(domaine, role, coche) {
    setEtat((current) => ({
      ...current,
      domaines: current.domaines.map((ligne) => (ligne.domaine !== domaine ? ligne : {
        ...ligne,
        roles: coche ? [...ligne.roles, role] : ligne.roles.filter((code) => code !== role),
      })),
    }))
  }

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const result = await apiRequest('/admin/circuit', {
        method: 'PUT',
        body: JSON.stringify({ domaines: etat.domaines.map(({ domaine, roles }) => ({ domaine, roles })) }),
      })
      setEtat(result.data)
      toast.success('Circuit de validation enregistré.')
    } catch (saveError) {
      setError(errorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="parametres-fonctionnels-page">
      <PageBanner
        description="Choisissez les directeurs sollicités pour chaque domaine coché en section 7. Ils reçoivent le plan en même temps, et tous doivent l’approuver."
        title="Circuit de validation"
      />
      {error && <Alert severity="error">{error}</Alert>}
      {!etat ? (!error && <Skeleton height={44} lines={4} />) : (
        <form className="parametres-fonctionnels-page__form" noValidate onSubmit={save}>
          {etat.domaines.map((ligne) => (
            <fieldset disabled={saving} key={ligne.domaine}>
              <legend>{ligne.libelle}</legend>
              {ligne.choisi_sur_la_fiche
                ? <p>Le pilote précise le domaine et choisit le directeur sur la fiche.</p>
                : etat.directeurs.map((directeur) => (
                  <Checkbox
                    checked={ligne.roles.includes(directeur.code)}
                    key={directeur.code}
                    label={directeur.libelle}
                    onChange={(coche) => basculer(ligne.domaine, directeur.code, coche)}
                  />
                ))}
            </fieldset>
          ))}
          <Button loading={saving} loadingLabel="Enregistrement…" type="submit">Enregistrer le circuit</Button>
        </form>
      )}
    </section>
  )
}

export default CircuitValidation
