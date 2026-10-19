import { SECTIONS } from '../../utils/constants.js'
import Icon from '../ui/Icon.jsx'
import './SectionStepper.css'

const completudeLabel = { complet: 'complète', partiel: 'partielle', vide: 'vide' }

// Icône selon la raison pour laquelle la section n'est pas modifiable : figée (cadenas),
// pas encore ouverte (horloge), remplie par les validations (coche). Rien quand la section
// est modifiable, ni pour un profil qui ne rédige pas la fiche (tout y est en lecture).
const ETAT_ICONE = {
  fige: { icon: 'lock', label: 'figée' },
  a_venir: { icon: 'clock', label: 'à venir' },
  auto: { icon: 'validation', label: 'remplie par les validations' },
}

function SectionStepper({ active, completude = [], etats = [], onSelect }) {
  const etatsParNumero = Object.fromEntries(etats.map((etat) => [etat.numero, etat]))

  return (
    <nav aria-label="Sections de la fiche A3" className="section-stepper">
      {SECTIONS.map((section, index) => {
        const numero = index + 1
        const remplissage = completude[index] ?? 'vide'
        const etat = etatsParNumero[numero]
        const icone = ETAT_ICONE[etat?.etat]
        return (
          <button
            aria-current={active === numero ? 'step' : undefined}
            className={[active === numero && 'is-active', etat?.etat === 'editable' && 'is-editable'].filter(Boolean).join(' ') || undefined}
            key={section}
            title={[`Section ${completudeLabel[remplissage]}`, etat?.raison].filter(Boolean).join(' · ')}
            type="button"
            onClick={() => onSelect(numero)}
          >
            <i aria-hidden="true" className={`section-stepper__dot section-stepper__dot--${remplissage}`} />
            {numero}. {section}
            {icone && <small className={`section-stepper__etat section-stepper__etat--${etat.etat}`}><Icon name={icone.icon} size={12} /><span className="sar-sr-only">{icone.label}</span></small>}
            {etat?.etat === 'editable' && <small className="section-stepper__etat section-stepper__etat--editable"><Icon name="edit" size={12} /><span className="sar-sr-only">modifiable</span></small>}
          </button>
        )
      })}
    </nav>
  )
}

export default SectionStepper
