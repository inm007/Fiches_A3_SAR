import { Select, TextArea, TextInput } from '../../ui/FormControls.jsx'
import { IMPACTS } from '../../../utils/constants.js'
import { formatFcfa } from '../../../utils/format.js'
import Astuce, { Pastilles } from './Astuce.jsx'
import { listOptions } from './options.js'
import './FicheSection.css'

const EXEMPLES = {
  HSE: 'Ex. : risque de brûlure lors des purges manuelles, 2 presque-accidents en 2026.',
  PRODUCTION: 'Ex. : 3 arrêts de 4 h par mois, soit 1 200 t de brut non traité.',
  QUALITE: 'Ex. : 5 lots hors spécification soufre sur le trimestre.',
  ENERGIE: 'Ex. : 20 t/h de vapeur perdues, +8 % de fioul consommé.',
  SURETE: 'Ex. : automate accessible sans mot de passe depuis le réseau bureautique.',
}

export default function Section02Contexte({ draft, set, refs, readOnly }) {
  const impacts = draft.impacts ?? {}
  const choisis = IMPACTS.map(([code]) => code).filter((code) => code in impacts)
  const choisir = (codes) => set('impacts', Object.fromEntries(codes.map((code) => [code, impacts[code] ?? ''])))

  return (
    <div className="fiche-section">
      <Astuce ouvert={!readOnly && !draft.contexte} titre="Astuce : un bon énoncé du problème">
        <ul>
          <li>Décrivez ce qui se passe, sans supposer la cause ni la solution.</li>
          <li>Répondez à : quoi, où, quand, depuis quand, combien de fois.</li>
          <li>Chiffrez dès que possible : c’est ce chiffre que vous suivrez en section 3.</li>
        </ul>
      </Astuce>

      <div className="fiche-section__grid">
        <TextArea hint="Pourquoi ce sujet maintenant ? Événement déclencheur, enjeu pour l’unité." label="Contexte" readOnly={readOnly} required value={draft.contexte} onChange={(value) => set('contexte', value)} />
        <TextArea label="Énoncé du problème" readOnly={readOnly} required rows={4} value={draft.enonce_probleme} onChange={(value) => set('enonce_probleme', value)} />
        <Select label="Fréquence" options={listOptions(refs, 'frequence', 'id')} readOnly={readOnly} value={draft.frequence_id} onChange={(value) => set('frequence_id', value)} />
        <TextInput
          hint={draft.impact_financier_estime ? formatFcfa(draft.impact_financier_estime) : 'Montant entier en FCFA, par an.'}
          label="Impact financier estimé (FCFA)"
          min="0"
          readOnly={readOnly}
          type="number"
          value={draft.impact_financier_estime}
          onChange={(value) => set('impact_financier_estime', value)}
        />
      </div>

      <h3>Impacts</h3>
      <p className="fiche-section__help">Touchez les domaines concernés, puis décrivez l’impact de chacun en une ou deux phrases chiffrées.</p>
      <Pastilles label="Domaines impactés" options={IMPACTS} readOnly={readOnly} value={choisis} onChange={choisir} />
      {choisis.length === 0 && <p className="fiche-section__muted">Aucun impact choisi.</p>}
      <div className="fiche-section__grid">
        {IMPACTS.filter(([code]) => choisis.includes(code)).map(([code, label]) => (
          <TextArea
            key={code}
            label={`Impact ${label}`}
            placeholder={EXEMPLES[code]}
            readOnly={readOnly}
            rows={2}
            value={impacts[code]}
            onChange={(value) => set('impacts', { ...impacts, [code]: value })}
          />
        ))}
      </div>
    </div>
  )
}
