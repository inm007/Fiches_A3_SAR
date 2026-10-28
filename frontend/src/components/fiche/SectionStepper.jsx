import { PHASES_SECTIONS, SECTIONS } from '../../utils/constants.js'
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

/**
 * Sommaire des 12 sections, regroupées en quatre temps colorés. La pastille numérotée
 * se remplit quand la section est complète ; un point orange signale une section entamée.
 */
function SectionStepper({ active, completude = [], etats = [], onSelect }) {
  const etatsParNumero = Object.fromEntries(etats.map((etat) => [etat.numero, etat]))
  const completes = completude.filter((valeur) => valeur === 'complet').length

  return (
    <nav aria-label="Sections de la fiche A3" className="section-stepper">
      <div className="section-stepper__progress">
        <span><strong>{completes}</strong> / 12 sections complètes</span>
        <span aria-hidden="true" className="section-stepper__bar"><i style={{ width: `${(completes / 12) * 100}%` }} /></span>
      </div>
      {PHASES_SECTIONS.map((phase) => (
        <div className={`section-stepper__phase section-stepper__phase--${phase.code}`} key={phase.code}>
          <span className="section-stepper__phase-title">{phase.titre}</span>
          {phase.sections.map((numero) => {
            const section = SECTIONS[numero - 1]
            const remplissage = completude[numero - 1] ?? 'vide'
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
                <span aria-hidden="true" className={`section-stepper__num section-stepper__num--${remplissage}`}>
                  {remplissage === 'complet' ? <Icon name="check" size={13} /> : numero}
                </span>
                <span className="section-stepper__label">{section}<span className="sar-sr-only"> ({completudeLabel[remplissage]})</span></span>
                {icone && <small className={`section-stepper__etat section-stepper__etat--${etat.etat}`}><Icon name={icone.icon} size={12} /><span className="sar-sr-only">{icone.label}</span></small>}
                {etat?.etat === 'editable' && <small className="section-stepper__etat section-stepper__etat--editable"><Icon name="edit" size={12} /><span className="sar-sr-only">modifiable</span></small>}
              </button>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

export default SectionStepper
