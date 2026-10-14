import StatusBadge from '../../common/StatusBadge.jsx'
import { DECISIONS } from '../../../utils/constants.js'
import { formatDate } from '../../../utils/format.js'
import './FicheSection.css'
import './RowsEditor.css'

const decisionTone = { EN_ATTENTE: 'warning', VALIDE: 'success', REFUSE: 'error', ANNULE: 'neutral' }

export default function Section12Validation({ fiche }) {
  const signatures = fiche.validations.filter((validation) => validation.decision !== 'ANNULE')

  return (
    <div className="fiche-section">
      <p className="fiche-section__help">Lecture seule : signatures des portes 1 (plan) et 2 (clôture).</p>
      <div className="rows-editor__scroll">
        <table className="fiche-section__table">
          <thead>
            <tr><th>Porte</th><th>Fonction</th><th>Nom</th><th>Date</th><th>Décision</th><th>Commentaire</th><th>Version</th></tr>
          </thead>
          <tbody>
            {signatures.length === 0 && <tr><td className="rows-editor__empty" colSpan={7}>Aucune validation demandée pour l’instant.</td></tr>}
            {signatures.map((validation) => (
              <tr key={validation.id}>
                <td>{validation.porte === 1 ? '1 — Plan' : '2 — Clôture'}</td>
                <td>{validation.role?.libelle}</td>
                <td>{validation.valideur?.nom}</td>
                <td>{formatDate(validation.decidee_le ?? validation.demandee_le)}</td>
                <td><StatusBadge tone={decisionTone[validation.decision]}>{DECISIONS[validation.decision]}</StatusBadge></td>
                <td>{validation.commentaire ?? '—'}</td>
                <td>v{validation.version_fiche}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p><strong>Date de clôture :</strong> {formatDate(fiche.date_cloture)}</p>
    </div>
  )
}
