import { Checkbox, TextInput } from '../../common/FormControls.jsx'
import StatusBadge from '../../common/StatusBadge.jsx'
import { CATEGORIES_GAIN, STATUTS_GAIN } from '../../../utils/constants.js'
import { formatFcfa, formatPayback } from '../../../utils/format.js'
import RowsEditor, { CellInput, CellSelect } from './RowsEditor.jsx'
import './FicheSection.css'

const gainTone = { PROPOSE: 'neutral', VALIDE: 'success', REFUSE: 'error' }

export default function Section09Gains({ draft, set, fiche, readOnly }) {
  const totaux = fiche.gains
  const locked = (row) => readOnly || row.statut === 'VALIDE'

  return (
    <div className="fiche-section">
      <p className="fiche-section__help">
        Le montant annuel (quantité × coût unitaire) est calculé par le serveur, en FCFA entiers. Un gain validé par le Contrôle de gestion n’est plus modifiable.
      </p>
      <Checkbox checked={draft.sans_gain_chiffre} label="Sans gain chiffré (le Contrôle de gestion n’est pas sollicité)" readOnly={readOnly || draft.gains.length > 0} onChange={(value) => set('sans_gain_chiffre', value)} />
      {!draft.sans_gain_chiffre && (
        <RowsEditor
          addLabel="Ajouter un gain"
          canRemove={(row) => row.statut !== 'VALIDE'}
          columns={[
            { key: 'categorie', label: 'Catégorie *', width: 160, render: (row, setRow) => <CellSelect options={CATEGORIES_GAIN} readOnly={locked(row)} value={row.categorie} onChange={(value) => setRow('categorie', value)} /> },
            { key: 'hypothese_calcul', label: 'Hypothèse de calcul *', width: 200, render: (row, setRow) => <CellInput readOnly={locked(row)} value={row.hypothese_calcul} onChange={(value) => setRow('hypothese_calcul', value)} /> },
            { key: 'quantite', label: 'Quantité *', width: 90, render: (row, setRow) => <CellInput min="0" readOnly={locked(row)} step="any" type="number" value={row.quantite} onChange={(value) => setRow('quantite', value)} /> },
            { key: 'unite', label: 'Unité *', width: 70, render: (row, setRow) => <CellInput readOnly={locked(row)} value={row.unite} onChange={(value) => setRow('unite', value)} /> },
            { key: 'cout_unitaire', label: 'Coût unitaire (FCFA) *', width: 120, render: (row, setRow) => <CellInput min="0" readOnly={locked(row)} type="number" value={row.cout_unitaire} onChange={(value) => setRow('cout_unitaire', value)} /> },
            { key: 'montant_annuel', label: 'Montant annuel', width: 130, render: (row) => formatFcfa(row.montant_annuel) },
            { key: 'statut', label: 'Statut', width: 90, render: (row) => <StatusBadge tone={gainTone[row.statut ?? 'PROPOSE']}>{STATUTS_GAIN[row.statut ?? 'PROPOSE']}</StatusBadge> },
          ]}
          emptyLabel="Aucun gain chiffré."
          newRow={() => ({ categorie: '', hypothese_calcul: '', quantite: '', unite: '', cout_unitaire: '', statut: 'PROPOSE' })}
          readOnly={readOnly}
          rows={draft.gains}
          onChange={(rows) => set('gains', rows)}
        />
      )}
      <div className="fiche-section__grid">
        <TextInput
          hint={`Somme des coûts estimés des actions : ${formatFcfa(totaux.somme_couts_actions)}`}
          label="Coût de mise en œuvre B (FCFA)"
          min="0"
          readOnly={readOnly}
          type="number"
          value={draft.cout_mise_en_oeuvre_b}
          onChange={(value) => set('cout_mise_en_oeuvre_b', value)}
        />
      </div>
      <div className="fiche-section__totaux">
        <div className="fiche-section__total"><span>Total A (hors refusés)</span><strong>{formatFcfa(totaux.total_a)}</strong></div>
        <div className="fiche-section__total"><span>Coût B</span><strong>{formatFcfa(totaux.cout_mise_en_oeuvre_b)}</strong></div>
        <div className="fiche-section__total"><span>Gain net A − B</span><strong>{formatFcfa(totaux.gain_net)}</strong></div>
        <div className="fiche-section__total"><span>Délai de retour</span><strong>{formatPayback(totaux.payback_annees)}</strong></div>
      </div>
      <p className="fiche-section__muted">Gains validés : {formatFcfa(totaux.total_a_valide)}. Seuls les gains validés entrent dans les indicateurs officiels.</p>
    </div>
  )
}
