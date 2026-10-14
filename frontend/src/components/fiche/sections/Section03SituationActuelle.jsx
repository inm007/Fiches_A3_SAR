import { formatNumber } from '../../../utils/format.js'
import RowsEditor, { CellInput, CellSelect } from './RowsEditor.jsx'
import './FicheSection.css'

const sens = [['hausse', 'Hausse'], ['baisse', 'Baisse']]

export default function Section03SituationActuelle({ draft, set, fiche, readOnly }) {
  const saved = Object.fromEntries(fiche.indicateurs.map((indicateur) => [indicateur.id, indicateur]))
  const field = (key, props = {}) => ({
    key,
    render: (row, setRow) => <CellInput readOnly={readOnly} value={row[key]} onChange={(value) => setRow(key, value)} {...props} />,
  })

  return (
    <div className="fiche-section">
      <p className="fiche-section__help">
        Les indicateurs sont saisis une fois : la valeur actuelle est la valeur Avant de la section 8.
        L’écart (actuelle − cible, ou référence) est calculé par le serveur à l’enregistrement.
      </p>
      <RowsEditor
        addLabel="Ajouter un indicateur"
        columns={[
          { ...field('libelle'), label: 'Indicateur *', width: 200, render: (row, setRow) => (
            <span>
              {row.principal && <span title="Indicateur principal">★ </span>}
              <CellInput readOnly={readOnly} value={row.libelle} onChange={(value) => setRow('libelle', value)} />
            </span>
          ) },
          { ...field('unite_mesure'), label: 'Unité *', width: 80 },
          { key: 'sens', label: 'Sens souhaité', width: 100, render: (row, setRow) => <CellSelect options={sens} readOnly={readOnly} value={row.sens} onChange={(value) => setRow('sens', value)} /> },
          { ...field('reference', { type: 'number', step: 'any' }), label: 'Référence', width: 90 },
          { ...field('cible', { type: 'number', step: 'any' }), label: 'Cible', width: 90 },
          { ...field('actuelle', { type: 'number', step: 'any' }), label: 'Actuelle', width: 90 },
          { key: 'ecart', label: 'Écart', width: 80, render: (row) => <span className="fiche-section__muted">{row.id ? formatNumber(saved[row.id]?.ecart) : '—'}</span> },
          { ...field('source'), label: 'Source', width: 120 },
          { ...field('periode'), label: 'Période', width: 110 },
        ]}
        emptyLabel="Aucun indicateur. Ajoutez au moins l’indicateur principal."
        newRow={() => ({ libelle: '', unite_mesure: '', sens: 'hausse', reference: '', cible: '', actuelle: '', source: '', periode: '' })}
        readOnly={readOnly}
        rows={draft.indicateurs}
        onChange={(rows) => set('indicateurs', rows)}
      />
    </div>
  )
}
