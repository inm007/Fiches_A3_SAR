import { Checkbox, Select, TextArea } from '../../ui/FormControls.jsx'
import './FicheSection.css'

export default function Section04Objectif({ draft, set, fiche, readOnly }) {
  const indicateurs = fiche.indicateurs.map((indicateur) => [String(indicateur.id), `${indicateur.libelle} (${indicateur.unite_mesure})`])
  const toggle = (id, checked) => set(
    'indicateurs_a_ne_pas_degrader',
    checked ? [...draft.indicateurs_a_ne_pas_degrader, id] : draft.indicateurs_a_ne_pas_degrader.filter((current) => current !== id),
  )

  return (
    <div className="fiche-section">
      <p className="fiche-section__help">Fixez un objectif SMART et les KPI qui conditionnent la clôture.</p>
      <div className="fiche-section__grid">
        <TextArea label="Objectif SMART" readOnly={readOnly} required value={draft.objectif_smart} onChange={(value) => set('objectif_smart', value)} />
        <TextArea label="Périmètre" readOnly={readOnly} value={draft.perimetre} onChange={(value) => set('perimetre', value)} />
        <Select
          hint={indicateurs.length ? undefined : 'Enregistrez d’abord les indicateurs de la section 3.'}
          label="KPI principal"
          options={indicateurs}
          readOnly={readOnly}
          required
          value={draft.indicateur_principal_id}
          onChange={(value) => set('indicateur_principal_id', value)}
        />
        <div className="sar-field">
          <span className="sar-field__label">KPI à ne pas dégrader</span>
          <div className="fiche-section__checks">
            {fiche.indicateurs
              .filter((indicateur) => String(indicateur.id) !== String(draft.indicateur_principal_id))
              .map((indicateur) => (
                <Checkbox
                  key={indicateur.id}
                  checked={draft.indicateurs_a_ne_pas_degrader.includes(indicateur.id)}
                  label={indicateur.libelle}
                  readOnly={readOnly}
                  onChange={(checked) => toggle(indicateur.id, checked)}
                />
              ))}
          </div>
        </div>
        <TextArea label="Résultats attendus (conditions de clôture)" readOnly={readOnly} value={draft.resultats_attendus} onChange={(value) => set('resultats_attendus', value)} />
      </div>
    </div>
  )
}
