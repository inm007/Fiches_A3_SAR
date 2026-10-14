import { TextArea } from '../../common/FormControls.jsx'
import { RUBRIQUES_LECONS } from '../../../utils/constants.js'
import './FicheSection.css'

export default function Section11Lecons({ draft, set, readOnly }) {
  return (
    <div className="fiche-section">
      <p className="fiche-section__help">Capitalisez l’expérience pour les fiches suivantes.</p>
      <div className="fiche-section__grid">
        {RUBRIQUES_LECONS.map(([code, label]) => (
          <TextArea
            key={code}
            label={label}
            readOnly={readOnly}
            value={draft.lecons?.[code]}
            onChange={(value) => set('lecons', { ...draft.lecons, [code]: value })}
          />
        ))}
      </div>
    </div>
  )
}
