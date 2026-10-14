import { STATUTS_SIMPLES, TYPES_PERENNISATION } from '../../../utils/constants.js'
import RowsEditor, { CellInput, CellSelect } from './RowsEditor.jsx'
import { peopleOptions } from './options.js'
import './FicheSection.css'

export default function Section10Perennisation({ draft, set, options, readOnly }) {
  return (
    <div className="fiche-section">
      <p className="fiche-section__help">
        Standardisez le résultat. Les audits de maintien J+30, J+60 et J+90 sont suivis dans l’onglet Contrôles.
      </p>
      <RowsEditor
        addLabel="Ajouter une action de pérennisation"
        columns={[
          { key: 'type', label: 'Type *', width: 170, render: (row, setRow) => <CellSelect options={TYPES_PERENNISATION} readOnly={readOnly} value={row.type} onChange={(value) => setRow('type', value)} /> },
          { key: 'responsable_id', label: 'Responsable', width: 160, render: (row, setRow) => <CellSelect options={peopleOptions(options?.responsables)} readOnly={readOnly} value={row.responsable_id} onChange={(value) => setRow('responsable_id', value)} /> },
          { key: 'date', label: 'Date', width: 130, render: (row, setRow) => <CellInput readOnly={readOnly} type="date" value={row.date} onChange={(value) => setRow('date', value)} /> },
          { key: 'statut', label: 'Statut *', width: 110, render: (row, setRow) => <CellSelect options={STATUTS_SIMPLES} readOnly={readOnly} value={row.statut} onChange={(value) => setRow('statut', value)} /> },
          { key: 'preuve', label: 'Preuve', width: 180, render: (row, setRow) => <CellInput readOnly={readOnly} value={row.preuve} onChange={(value) => setRow('preuve', value)} /> },
        ]}
        emptyLabel="Aucune action de pérennisation."
        newRow={() => ({ type: '', responsable_id: '', date: '', statut: 'A_FAIRE', preuve: '' })}
        readOnly={readOnly}
        rows={draft.perennisation}
        onChange={(rows) => set('perennisation', rows)}
      />
    </div>
  )
}
