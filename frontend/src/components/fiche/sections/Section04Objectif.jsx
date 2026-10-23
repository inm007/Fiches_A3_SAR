import { useEffect } from 'react'
import Button from '../../ui/Button.jsx'
import { Select, TextArea } from '../../ui/FormControls.jsx'
import { proposerObjectif } from '../../../utils/a3Calculs.js'
import { formatDate, formatNumber } from '../../../utils/format.js'
import Astuce from './Astuce.jsx'
import { peopleOptions } from './options.js'
import './FicheSection.css'

export default function Section04Objectif({ draft, set, fiche, options, readOnly }) {
  const principal = fiche.indicateurs.find((indicateur) => indicateur.principal)
  const aSurveiller = fiche.indicateurs.filter((indicateur) => indicateur.a_ne_pas_degrader)
  const proposition = proposerObjectif(principal, fiche.identification.date_cible)
  const chefPropose = options?.chef_propose

  // Le chef du département du pilote est proposé par défaut ; le pilote peut en choisir un autre.
  useEffect(() => {
    if (!readOnly && !draft.chef_pertinence_id && chefPropose) set('chef_pertinence_id', String(chefPropose))
  }, [readOnly, draft.chef_pertinence_id, chefPropose]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fiche-section">
      <Astuce ouvert={!readOnly && !draft.objectif_smart} titre="Astuce : un objectif SMART">
        <p>Spécifique, Mesurable, Atteignable, Réaliste et Temporel : <em>« Réduire la consommation de vapeur de 100 à 80 t/h d’ici le 31/01, et tenir ce niveau trois mois. »</em></p>
        <p>Les <strong>résultats attendus</strong> disent ce qu’il faudra constater pour clôturer : ce sont vos conditions de clôture.</p>
        <p>Choisissez ensuite le <strong>chef de département</strong> qui jugera la pertinence : il pourra valider, renvoyer la fiche à refaire ou la classer sans suite.</p>
      </Astuce>

      <div className="fiche-section__kpi">
        <span className="fiche-section__kpi-label">KPI principal (section 3)</span>
        {principal ? (
          <>
            <strong>{principal.libelle}</strong>
            <span>
              Aujourd’hui {formatNumber(principal.actuelle)} {principal.unite_mesure} · cible {formatNumber(principal.cible)} {principal.unite_mesure}
              {' '}· à faire {principal.sens === 'baisse' ? 'baisser' : 'monter'} · date cible {formatDate(fiche.identification.date_cible)}
            </span>
            {aSurveiller.length > 0 && <span className="fiche-section__muted">À ne pas dégrader : {aSurveiller.map((indicateur) => indicateur.libelle).join(', ')}</span>}
          </>
        ) : (
          <span className="fiche-section__muted">Aucun KPI principal : choisissez-le en section 3, puis enregistrez.</span>
        )}
      </div>

      <div className="fiche-section__grid">
        <TextArea label="Objectif SMART" readOnly={readOnly} required value={draft.objectif_smart} onChange={(value) => set('objectif_smart', value)} />
        {!readOnly && proposition && proposition !== draft.objectif_smart && (
          <div className="fiche-section__suggestion">
            <span>Proposition à partir du KPI : « {proposition} »</span>
            <Button size="small" type="button" variant="secondary" onClick={() => set('objectif_smart', proposition)}>Utiliser cette phrase</Button>
          </div>
        )}
        <TextArea hint="Où s’applique l’amélioration : ligne, équipement, équipe, période." label="Périmètre" readOnly={readOnly} value={draft.perimetre} onChange={(value) => set('perimetre', value)} />
        <TextArea
          hint="Ce qu’il faudra constater pour clôturer la fiche."
          label="Résultats attendus (conditions de clôture)"
          placeholder="Ex. : consommation sous 80 t/h trois mois de suite, aucun purgeur fuyard à la ronde."
          readOnly={readOnly}
          required
          value={draft.resultats_attendus}
          onChange={(value) => set('resultats_attendus', value)}
        />
      </div>

      <h3>Validation de la pertinence (porte 0)</h3>
      <div className="fiche-section__grid">
        <Select
          hint={chefPropose ? 'Proposé : le chef de votre département. Vous pouvez en choisir un autre.' : 'Le chef qui recevra la fiche quand vous la soumettrez.'}
          label="Chef de département qui valide"
          options={peopleOptions(options?.chefs)}
          readOnly={readOnly}
          required
          value={draft.chef_pertinence_id}
          onChange={(value) => set('chef_pertinence_id', value)}
        />
      </div>
    </div>
  )
}
