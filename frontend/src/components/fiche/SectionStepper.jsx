import { SECTIONS } from '../../utils/constants.js'
import Icon from '../ui/Icon.jsx'
import './SectionStepper.css'

const completudeLabel = { complet: 'complète', partiel: 'partielle', vide: 'vide' }

function SectionStepper({ active, completude = {}, editables = [], onSelect }) {
  return (
    <nav aria-label="Sections de la fiche A3" className="section-stepper">
      {SECTIONS.map((section, index) => {
        const numero = index + 1
        const etat = completude[numero] ?? 'vide'
        return (
          <button
            aria-current={active === numero ? 'step' : undefined}
            className={active === numero ? 'is-active' : undefined}
            key={section}
            title={`Section ${completudeLabel[etat]}${editables.includes(numero) ? '' : ' · lecture seule'}`}
            type="button"
            onClick={() => onSelect(numero)}
          >
            <i aria-hidden="true" className={`section-stepper__dot section-stepper__dot--${etat}`} />
            {numero}. {section}
            {!editables.includes(numero) && <small><Icon name="lock" size={12} /><span className="sar-sr-only">lecture seule</span></small>}
          </button>
        )
      })}
    </nav>
  )
}

export default SectionStepper
