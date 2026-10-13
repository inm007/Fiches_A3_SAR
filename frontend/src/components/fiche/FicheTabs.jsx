import './FicheTabs.css'

const tabs = ['Fiche', 'Actions', 'Contrôles', 'Validations', 'Pièces jointes', 'Commentaires', 'Historique']

function FicheTabs() {
  return (
    <nav aria-label="Rubriques de la fiche" className="fiche-tabs">
      {tabs.map((tab) => <button key={tab} type="button">{tab}</button>)}
    </nav>
  )
}

export default FicheTabs
