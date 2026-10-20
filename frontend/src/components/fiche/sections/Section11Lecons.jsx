import { TextArea } from '../../ui/FormControls.jsx'
import { RUBRIQUES_LECONS } from '../../../utils/constants.js'
import Astuce from './Astuce.jsx'
import './FicheSection.css'

const QUESTIONS = {
  A_FONCTIONNE: 'Quelle action a fait la différence ? Qu’est-ce qui a aidé (méthode, équipe, outil) ?',
  N_A_PAS_FONCTIONNE: 'Qu’est-ce qui a freiné ou coûté du temps ? Que feriez-vous autrement ?',
  STANDARD_A_REPLIQUER: 'Quel standard peut servir à une autre unité ou un équipement semblable ?',
  RETOUR_EXPERIENCE: 'Ce qu’il faut retenir en deux phrases pour le partager en revue.',
  PROJET_SUIVANT: 'Un sujet voisin à traiter par une nouvelle fiche ?',
}

export default function Section11Lecons({ draft, set, readOnly }) {
  return (
    <div className="fiche-section">
      <Astuce ouvert={!readOnly && Object.values(draft.lecons ?? {}).every((texte) => !texte)} titre="Astuce : capitaliser">
        <p>Quelques lignes suffisent. Répondez aux questions qui vous parlent : au moins une rubrique est demandée pour soumettre la clôture.</p>
      </Astuce>
      <div className="fiche-section__grid">
        {RUBRIQUES_LECONS.map(([code, label]) => (
          <TextArea
            key={code}
            label={label}
            placeholder={QUESTIONS[code]}
            readOnly={readOnly}
            value={draft.lecons?.[code]}
            onChange={(value) => set('lecons', { ...draft.lecons, [code]: value })}
          />
        ))}
      </div>
    </div>
  )
}
