import { Checkbox, TextInput } from '../../ui/FormControls.jsx'
import Badge from '../../ui/Badge.jsx'
import { STATUTS_GAIN } from '../../../utils/constants.js'
import { montantGain, totauxGains } from '../../../utils/a3Calculs.js'
import { formatFcfa, formatPayback } from '../../../utils/format.js'
import Astuce from './Astuce.jsx'
import CardsEditor from './CardsEditor.jsx'
import { CellInput, CellSelect } from './RowsEditor.jsx'
import { listOptions } from './options.js'
import './FicheSection.css'

const gainTone = { PROPOSE: 'neutral', VALIDE: 'success', REFUSE: 'error' }

export default function Section09Gains({ draft, set, fiche, refs, readOnly }) {
  const categories = listOptions(refs, 'categorie_gain')
  const totaux = totauxGains(draft.sans_gain_chiffre ? [] : draft.gains, draft.cout_mise_en_oeuvre_b)

  return (
    <div className="fiche-section">
      <Astuce ouvert={!readOnly && draft.gains.length === 0 && !draft.sans_gain_chiffre} titre="Astuce : chiffrer les gains">
        <ul>
          <li>Un gain par nature : production récupérée, énergie économisée, maintenance évitée… Écrivez l’hypothèse pour que le Contrôle de gestion puisse la vérifier.</li>
          <li>Montant annuel = quantité par an × coût unitaire. Les totaux se calculent pendant la saisie.</li>
          <li>Pas de gain chiffrable (sécurité, conformité) ? Cochez « sans gain chiffré » : seule la Direction validera la clôture.</li>
        </ul>
      </Astuce>

      <Checkbox checked={draft.sans_gain_chiffre} label="Sans gain chiffré (le Contrôle de gestion n’est pas sollicité)" readOnly={readOnly || draft.gains.length > 0} onChange={(value) => set('sans_gain_chiffre', value)} />
      {!draft.sans_gain_chiffre && (
        <CardsEditor
          addLabel="Ajouter un gain"
          badges={(row) => <Badge tone={gainTone[row.statut ?? 'PROPOSE']}>{STATUTS_GAIN[row.statut ?? 'PROPOSE']}</Badge>}
          canRemove={(row) => row.statut !== 'VALIDE'}
          emptyLabel="Aucun gain chiffré."
          fields={[
            { key: 'categorie', label: 'Nature du gain *', render: (row, setRow, _, locked) => <CellSelect options={categories} readOnly={locked} value={row.categorie} onChange={(value) => setRow('categorie', value)} /> },
            { key: 'hypothese_calcul', label: 'Hypothèse de calcul *', wide: true, render: (row, setRow, _, locked) => <CellInput placeholder="Ex. : 20 t/h de vapeur économisées × 8 400 h/an" readOnly={locked} value={row.hypothese_calcul} onChange={(value) => setRow('hypothese_calcul', value)} /> },
            { key: 'quantite', label: 'Quantité par an *', render: (row, setRow, _, locked) => <CellInput min="0" readOnly={locked} step="any" type="number" value={row.quantite} onChange={(value) => setRow('quantite', value)} /> },
            { key: 'unite', label: 'Unité *', render: (row, setRow, _, locked) => <CellInput placeholder="t, MWh, h…" readOnly={locked} value={row.unite} onChange={(value) => setRow('unite', value)} /> },
            { key: 'cout_unitaire', label: 'Coût unitaire (FCFA) *', render: (row, setRow, _, locked) => <CellInput min="0" readOnly={locked} type="number" value={row.cout_unitaire} onChange={(value) => setRow('cout_unitaire', value)} /> },
            { key: 'montant_annuel', label: 'Montant annuel', render: (row) => <span className="cards-editor__value">{formatFcfa(montantGain(row.quantite, row.cout_unitaire))}</span> },
          ]}
          locked={(row) => row.statut === 'VALIDE'}
          lockedLabel={() => 'Gain validé par le Contrôle de gestion : il ne se modifie plus.'}
          newRow={() => ({ categorie: '', hypothese_calcul: '', quantite: '', unite: '', cout_unitaire: '', statut: 'PROPOSE' })}
          readOnly={readOnly}
          rows={draft.gains}
          title={(row, index) => categories.find(([code]) => code === row.categorie)?.[1] ?? `Gain ${index + 1}`}
          onChange={(rows) => set('gains', rows)}
        />
      )}
      <div className="fiche-section__grid">
        <TextInput
          hint={`Somme des coûts estimés des actions : ${formatFcfa(fiche.gains.somme_couts_actions)}`}
          label="Coût de mise en œuvre B (FCFA)"
          min="0"
          readOnly={readOnly}
          type="number"
          value={draft.cout_mise_en_oeuvre_b}
          onChange={(value) => set('cout_mise_en_oeuvre_b', value)}
        />
      </div>
      <div className="fiche-section__totaux">
        <div className="fiche-section__total"><span>Gains annuels A (hors refusés)</span><strong>{formatFcfa(totaux.totalA)}</strong></div>
        <div className="fiche-section__total"><span>Coût B</span><strong>{formatFcfa(totaux.coutB)}</strong></div>
        <div className="fiche-section__total"><span>Gain net A − B</span><strong className={totaux.gainNet >= 0 ? 'fiche-section__ok' : 'fiche-section__ko'}>{formatFcfa(totaux.gainNet)}</strong></div>
        <div className="fiche-section__total"><span>Retour sur investissement</span><strong>{formatPayback(totaux.paybackAnnees)}</strong></div>
      </div>
      <p className="fiche-section__muted">Gains validés : {formatFcfa(fiche.gains.total_a_valide)}. Seuls les gains validés entrent dans les indicateurs officiels.</p>
    </div>
  )
}
