import StatusBadge from '../../common/StatusBadge.jsx'
import { STATUTS_ACTION } from '../../../utils/constants.js'
import RowsEditor, { CellInput, CellSelect } from './RowsEditor.jsx'
import { listOptions, peopleOptions } from './options.js'
import './FicheSection.css'

export default function Section06Actions({ draft, set, fiche, refs, options, readOnly }) {
  const causes = fiche.analyse.causes.map((cause) => [String(cause.id), `${cause.numero}. ${cause.libelle}`])
  const risques = fiche.risques.filter((risque) => risque.moc_requis).map((risque) => [String(risque.id), `MOC — ${risque.description}`])
  const types = listOptions(refs, 'type_action')
  const responsables = peopleOptions(options?.responsables)

  return (
    <div className="fiche-section">
      <p className="fiche-section__help">
        Chaque action est rattachée à une cause de la section 5. Liez-la au risque de la section 7 si elle exige un MOC (B1).
        L’avancement des actions se suit ensuite dans l’onglet Actions.
      </p>
      <RowsEditor
        addLabel="Ajouter une action"
        canRemove={(row) => !row.statut || row.statut === 'A_FAIRE'}
        columns={[
          { key: 'cause_id', label: 'Cause traitée *', width: 170, render: (row, setRow) => <CellSelect options={causes} readOnly={readOnly} value={row.cause_id} onChange={(value) => setRow('cause_id', value)} /> },
          { key: 'description', label: 'Description *', width: 220, render: (row, setRow) => <CellInput readOnly={readOnly} value={row.description} onChange={(value) => setRow('description', value)} /> },
          { key: 'type_action', label: 'Type *', width: 120, render: (row, setRow) => <CellSelect options={types} readOnly={readOnly} value={row.type_action} onChange={(value) => setRow('type_action', value)} /> },
          { key: 'responsable_id', label: 'Responsable *', width: 150, render: (row, setRow) => <CellSelect options={responsables} readOnly={readOnly} value={row.responsable_id} onChange={(value) => setRow('responsable_id', value)} /> },
          { key: 'echeance', label: 'Échéance *', width: 130, render: (row, setRow) => <CellInput readOnly={readOnly} type="date" value={row.echeance} onChange={(value) => setRow('echeance', value)} /> },
          { key: 'cout_estime', label: 'Coût estimé (FCFA)', width: 120, render: (row, setRow) => <CellInput min="0" readOnly={readOnly} type="number" value={row.cout_estime} onChange={(value) => setRow('cout_estime', value)} /> },
          { key: 'risque_id', label: 'MOC lié', width: 150, render: (row, setRow) => <CellSelect options={risques} placeholder="Aucun" readOnly={readOnly} value={row.risque_id} onChange={(value) => setRow('risque_id', value)} /> },
          { key: 'statut', label: 'Statut', width: 90, render: (row) => {
            const statut = STATUTS_ACTION[row.statut ?? 'A_FAIRE']
            return <StatusBadge tone={statut.tone}>{statut.label}</StatusBadge>
          } },
        ]}
        emptyLabel="Aucune action. Enregistrez d’abord les causes (section 5)."
        newRow={() => ({ cause_id: causes[0]?.[0] ?? '', description: '', type_action: '', responsable_id: '', echeance: '', cout_estime: '', risque_id: '' })}
        readOnly={readOnly}
        rows={draft.actions}
        onChange={(rows) => set('actions', rows)}
      />
    </div>
  )
}
