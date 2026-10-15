import { Select, TextArea, TextInput } from '../../ui/FormControls.jsx'
import { IMPACTS } from '../../../utils/constants.js'
import { listOptions } from './options.js'
import './FicheSection.css'

export default function Section02Contexte({ draft, set, refs, readOnly }) {
  return (
    <div className="fiche-section">
      <p className="fiche-section__help">Décrivez le contexte, le problème (faits, lieu, période, fréquence) et ses impacts.</p>
      <div className="fiche-section__grid">
        <TextArea label="Contexte" readOnly={readOnly} required value={draft.contexte} onChange={(value) => set('contexte', value)} />
        <TextArea label="Énoncé du problème" readOnly={readOnly} required rows={4} value={draft.enonce_probleme} onChange={(value) => set('enonce_probleme', value)} />
        <Select label="Fréquence" options={listOptions(refs, 'frequence', 'id')} readOnly={readOnly} value={draft.frequence_id} onChange={(value) => set('frequence_id', value)} />
        <TextInput hint="Montant entier en FCFA" label="Impact financier estimé (FCFA)" min="0" readOnly={readOnly} type="number" value={draft.impact_financier_estime} onChange={(value) => set('impact_financier_estime', value)} />
      </div>
      <h3>Impacts</h3>
      <div className="fiche-section__grid">
        {IMPACTS.map(([code, label]) => (
          <TextArea
            key={code}
            label={label}
            readOnly={readOnly}
            rows={2}
            value={draft.impacts?.[code]}
            onChange={(value) => set('impacts', { ...draft.impacts, [code]: value })}
          />
        ))}
      </div>
    </div>
  )
}
