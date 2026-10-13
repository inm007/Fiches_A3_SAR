import './SectionStepper.css'

const sections = [
  'Identification', 'Contexte, enjeu et problème', 'Situation actuelle', 'Objectif',
  'Analyse des causes racines', 'Plan de contre-mesures', 'Risques et MOC',
  'Résultats après action', 'Gains économiques', 'Standardisation et pérennisation',
  'Leçons apprises', 'Validation',
]

function SectionStepper() {
  return (
    <nav aria-label="Sections de la fiche A3" className="section-stepper">
      {sections.map((section, index) => (
        <button key={section} type="button"><span>{index + 1}</span>{section}</button>
      ))}
    </nav>
  )
}

export default SectionStepper
