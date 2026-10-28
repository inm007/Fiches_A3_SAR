import Badge from '../../ui/Badge.jsx'
import { ROLES_INDICATEUR } from '../../../utils/constants.js'
import { ecart } from '../../../utils/a3Calculs.js'
import { formatNumber } from '../../../utils/format.js'
import Astuce from './Astuce.jsx'
import CardsEditor from './CardsEditor.jsx'
import ChampAutre from './ChampAutre.jsx'
import { CellInput, CellSelect } from './RowsEditor.jsx'
import { listOptions } from './options.js'
import './FicheSection.css'

const SENS = [['baisse', 'À faire baisser'], ['hausse', 'À faire monter']]
const roleTone = { PRINCIPAL: 'brand', A_NE_PAS_DEGRADER: 'warning', SUIVI: 'neutral' }

// Une valeur saisie avant la liste administrable reste proposée.
const avecValeur = (options, value) => (value && !options.some(([code]) => code === value) ? [...options, [value, value]] : options)

export default function Section03SituationActuelle({ draft, set, refs, readOnly, onOptionCreee }) {
  const unites = listOptions(refs, 'unite_mesure', 'libelle')
  const principal = draft.indicateurs.find((indicateur) => indicateur.role === 'PRINCIPAL')

  // Un seul KPI principal : en choisir un nouveau repasse l'ancien en simple suivi.
  const onChange = (rows) => {
    const nouveau = rows.findIndex((row, index) => row.role === 'PRINCIPAL' && draft.indicateurs[index]?.role !== 'PRINCIPAL')
    set('indicateurs', nouveau === -1 ? rows : rows.map((row, index) => (index !== nouveau && row.role === 'PRINCIPAL' ? { ...row, role: 'SUIVI' } : row)))
  }

  return (
    <div className="fiche-section">
      <Astuce ouvert={!readOnly && draft.indicateurs.length === 0} titre="Astuce : choisir ses indicateurs">
        <ul>
          <li>Le <strong>KPI principal</strong> mesure le problème : c’est lui qui dira si l’objectif est atteint et s’il tient à J+30, J+60 et J+90.</li>
          <li>Un indicateur <strong>à ne pas dégrader</strong> surveille un effet de bord (sécurité, qualité…). Il sera remesuré après les actions.</li>
          <li>La valeur <strong>actuelle</strong> est votre point de départ ; l’écart avec la cible se calcule tout seul.</li>
        </ul>
      </Astuce>

      {!principal && draft.indicateurs.length > 0 && (
        <p className="fiche-section__warning">Choisissez le rôle « KPI principal » pour l’un des indicateurs.</p>
      )}

      <CardsEditor
        addLabel="Ajouter un indicateur"
        badges={(row) => <Badge tone={roleTone[row.role] ?? 'neutral'}>{ROLES_INDICATEUR.find(([code]) => code === row.role)?.[1] ?? 'Suivi'}</Badge>}
        emptyLabel="Aucun indicateur. Commencez par le KPI principal : celui qui mesure le problème."
        fields={[
          { key: 'libelle', label: 'Indicateur *', wide: true, render: (row, setRow) => <CellInput placeholder="Ex. : consommation de vapeur de la ligne L-12" readOnly={readOnly} value={row.libelle} onChange={(value) => setRow('libelle', value)} /> },
          { key: 'role', label: 'Rôle', render: (row, setRow) => <CellSelect options={ROLES_INDICATEUR} placeholder={null} readOnly={readOnly} value={row.role} onChange={(value) => setRow('role', value)} /> },
          { key: 'sens', label: 'Sens souhaité', render: (row, setRow) => <CellSelect options={SENS} placeholder={null} readOnly={readOnly} value={row.sens} onChange={(value) => setRow('sens', value)} /> },
          { key: 'unite_mesure', label: 'Unité *', render: (row, setRow) => <CellSelect options={avecValeur(unites, row.unite_mesure)} readOnly={readOnly} value={row.unite_mesure} onChange={(value) => setRow('unite_mesure', value)} /> },
          { key: 'actuelle', label: 'Valeur actuelle *', render: (row, setRow) => <CellInput readOnly={readOnly} step="any" type="number" value={row.actuelle} onChange={(value) => setRow('actuelle', value)} /> },
          { key: 'cible', label: 'Cible *', render: (row, setRow) => <CellInput readOnly={readOnly} step="any" type="number" value={row.cible} onChange={(value) => setRow('cible', value)} /> },
          { key: 'reference', label: 'Référence', render: (row, setRow) => <CellInput placeholder="Optionnel" readOnly={readOnly} step="any" type="number" value={row.reference} onChange={(value) => setRow('reference', value)} /> },
          { key: 'ecart', label: 'Écart à combler', render: (row) => {
            const valeur = ecart(row.actuelle, row.cible === '' ? row.reference : row.cible)
            return <span className="cards-editor__value">{valeur === null ? '—' : `${formatNumber(valeur)} ${row.unite_mesure ?? ''}`}</span>
          } },
          { key: 'source', label: 'Source', render: (row, setRow) => <ChampAutre label="Source" liste="source_donnees" readOnly={readOnly} refs={refs} value={row.source} valueKey="libelle" variant="cell" onChange={(value) => setRow('source', value)} onOptionCreee={onOptionCreee} /> },
          { key: 'periode', label: 'Période de mesure', render: (row, setRow) => <CellInput placeholder="Ex. : moyenne de mars 2026" readOnly={readOnly} value={row.periode} onChange={(value) => setRow('periode', value)} /> },
        ]}
        newRow={() => ({ libelle: '', unite_mesure: '', sens: 'baisse', reference: '', cible: '', actuelle: '', source: '', periode: '', role: principal ? 'SUIVI' : 'PRINCIPAL' })}
        readOnly={readOnly}
        rows={draft.indicateurs}
        title={(row, index) => row.libelle || `Indicateur ${index + 1}`}
        onChange={onChange}
      />
    </div>
  )
}
