import { Select, TextArea } from '../../common/FormControls.jsx'
import { OBJECTIF_ATTEINT } from '../../../utils/constants.js'
import { formatNumber, formatPercent } from '../../../utils/format.js'
import RowsEditor, { CellInput } from './RowsEditor.jsx'
import './FicheSection.css'

export default function Section08Resultats({ draft, set, fiche, readOnly }) {
  const indicateurs = Object.fromEntries(fiche.indicateurs.map((indicateur) => [indicateur.id, indicateur]))

  return (
    <div className="fiche-section">
      <p className="fiche-section__help">
        Saisissez la mesure Après du KPI principal et des KPI à ne pas dégrader (B3). L’écart et l’amélioration sont calculés par le serveur.
      </p>
      <RowsEditor
        columns={[
          { key: 'indicateur', label: 'Indicateur', width: 180, render: (row) => {
            const indicateur = indicateurs[row.indicateur_id]
            return <span>{indicateur?.principal && '★ '}{indicateur?.libelle}{indicateur?.a_ne_pas_degrader && ' (à ne pas dégrader)'}</span>
          } },
          { key: 'avant', label: 'Avant', width: 70, render: (row) => formatNumber(indicateurs[row.indicateur_id]?.actuelle) },
          { key: 'cible', label: 'Cible', width: 70, render: (row) => formatNumber(indicateurs[row.indicateur_id]?.cible) },
          { key: 'valeur', label: 'Après', width: 100, render: (row, setRow) => <CellInput readOnly={readOnly} step="any" type="number" value={row.valeur} onChange={(value) => setRow('valeur', value)} /> },
          { key: 'ecart', label: 'Écart', width: 70, render: (row) => formatNumber(indicateurs[row.indicateur_id]?.ecart_apres) },
          { key: 'amelioration', label: 'Amélioration', width: 110, render: (row) => formatPercent(indicateurs[row.indicateur_id]?.amelioration_pourcent) },
          { key: 'date_mesure', label: 'Date de mesure', width: 130, render: (row, setRow) => <CellInput readOnly={readOnly} type="date" value={row.date_mesure} onChange={(value) => setRow('date_mesure', value)} /> },
          { key: 'periode_verification', label: 'Période de vérification', width: 150, render: (row, setRow) => <CellInput readOnly={readOnly} value={row.periode_verification} onChange={(value) => setRow('periode_verification', value)} /> },
        ]}
        emptyLabel="Aucun indicateur (section 3)."
        newRow={() => ({})}
        readOnly
        rows={draft.mesures}
        onChange={(rows) => set('mesures', rows)}
      />
      <div className="fiche-section__grid">
        <Select label="Objectif atteint" options={OBJECTIF_ATTEINT} readOnly={readOnly} required value={draft.objectif_atteint} onChange={(value) => set('objectif_atteint', value)} />
        {draft.objectif_atteint === 'PARTIELLEMENT' && (
          <TextArea label="Écart et suite donnée" readOnly={readOnly} required value={draft.ecart_objectif} onChange={(value) => set('ecart_objectif', value)} />
        )}
      </div>
    </div>
  )
}
