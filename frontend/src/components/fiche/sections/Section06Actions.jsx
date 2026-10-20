import Badge from '../../ui/Badge.jsx'
import { STATUTS_ACTION } from '../../../utils/constants.js'
import { formatFcfa } from '../../../utils/format.js'
import Astuce from './Astuce.jsx'
import CardsEditor from './CardsEditor.jsx'
import { CellInput, CellSelect, CellTextArea } from './RowsEditor.jsx'
import { listOptions, peopleOptions } from './options.js'
import './FicheSection.css'

const terminee = (row) => row.statut === 'REALISE' || row.statut === 'ANNULE'

export default function Section06Actions({ draft, set, fiche, refs, options, readOnly }) {
  const causes = fiche.analyse.causes
  const causeOptions = causes.map((cause) => [String(cause.id), `${cause.numero}. ${cause.libelle}`])
  const risques = fiche.risques.filter((risque) => risque.moc_requis).map((risque) => [String(risque.id), `MOC — ${risque.description}`])
  const types = listOptions(refs, 'type_action')
  const responsables = peopleOptions(options?.responsables)
  const groupes = [
    ...causes.map((cause) => ({ id: String(cause.id), cause })),
    ...(draft.actions.some((action) => !causeOptions.some(([id]) => id === action.cause_id)) ? [{ id: '', cause: null }] : []),
  ]
  const actionsDe = (id) => draft.actions.filter((action) => (id === '' ? !causeOptions.some(([cause]) => cause === action.cause_id) : action.cause_id === id))
  const remplacer = (id, rows) => set('actions', [...draft.actions.filter((action) => !actionsDe(id).includes(action)), ...rows])
  const total = draft.actions.filter((action) => action.statut !== 'ANNULE').reduce((somme, action) => somme + (Number(action.cout_estime) || 0), 0)

  const fields = [
    { key: 'description', label: 'Que faut-il faire ? *', wide: true, render: (row, setRow, _, locked) => <CellInput placeholder="Un verbe d’action : remplacer, former, modifier…" readOnly={locked} value={row.description} onChange={(value) => setRow('description', value)} /> },
    { key: 'cause_id', label: 'Cause traitée *', render: (row, setRow, _, locked) => <CellSelect options={causeOptions} readOnly={locked} value={row.cause_id} onChange={(value) => setRow('cause_id', value)} /> },
    { key: 'type_action', label: 'Type *', render: (row, setRow, _, locked) => <CellSelect options={types} readOnly={locked} value={row.type_action} onChange={(value) => setRow('type_action', value)} /> },
    { key: 'responsable_id', label: 'Responsable *', render: (row, setRow, _, locked) => <CellSelect options={responsables} readOnly={locked} value={row.responsable_id} onChange={(value) => setRow('responsable_id', value)} /> },
    { key: 'echeance', label: 'Échéance *', render: (row, setRow, _, locked) => <CellInput readOnly={locked} type="date" value={row.echeance} onChange={(value) => setRow('echeance', value)} /> },
    { key: 'cout_estime', label: 'Coût estimé (FCFA)', render: (row, setRow, _, locked) => <CellInput min="0" readOnly={locked} type="number" value={row.cout_estime} onChange={(value) => setRow('cout_estime', value)} /> },
    { key: 'risque_id', label: 'MOC lié', hidden: () => risques.length === 0, render: (row, setRow, _, locked) => <CellSelect options={risques} placeholder="Aucun" readOnly={locked} value={row.risque_id} onChange={(value) => setRow('risque_id', value)} /> },
    { key: 'critere_efficacite', label: 'Critère d’efficacité * : comment saurez-vous qu’elle a marché ?', wide: true, render: (row, setRow, _, locked) => (
      <CellTextArea placeholder="Ex. : aucun purgeur fuyard à la ronde mensuelle ; consommation sous 80 t/h." readOnly={locked} value={row.critere_efficacite} onChange={(value) => setRow('critere_efficacite', value)} />
    ) },
  ]

  return (
    <div className="fiche-section">
      <Astuce ouvert={!readOnly && draft.actions.length === 0} titre="Astuce : comment construire le plan d’actions">
        <ul>
          <li><strong>Ici, vous préparez le plan</strong> : chaque action traite une cause de la section 5, en priorité les causes racines.</li>
          <li>Donnez à chaque action un responsable, une échéance et un <strong>critère d’efficacité</strong> : c’est ce que vous vérifierez aux contrôles J+30, J+60 et J+90.</li>
          <li>Si l’action touche le procédé, un équipement ou une procédure, liez-la au MOC de la section 7 : elle ne démarrera qu’avec le MOC clôturé.</li>
          <li><strong>Après la validation du plan</strong>, vous suivez les actions dans l’onglet <em>Actions</em> : démarrer, réaliser (avec une preuve), reporter, ou en ajouter une oubliée.</li>
        </ul>
      </Astuce>

      {causes.length === 0 && <p className="fiche-section__warning">Enregistrez d’abord les causes de la section 5 : chaque action se rattache à une cause.</p>}

      {groupes.map(({ id, cause }) => {
        const rows = actionsDe(id)
        const sansAction = cause?.racine && rows.filter((row) => row.statut !== 'ANNULE').length === 0
        return (
          <section className="fiche-section__group" key={id || 'sans-cause'}>
            <h3 className="fiche-section__group-title">
              {cause ? `Cause ${cause.numero} : ${cause.libelle}` : 'Actions sans cause'}
              {cause?.racine && <Badge tone="brand">Cause racine</Badge>}
            </h3>
            {sansAction && <p className="fiche-section__warning">Cette cause racine n’a pas encore d’action.</p>}
            <CardsEditor
              addLabel="Ajouter une action pour cette cause"
              badges={(row) => {
                const statut = STATUTS_ACTION[row.statut ?? 'A_FAIRE']
                return <Badge tone={statut.tone}>{statut.label}</Badge>
              }}
              canRemove={(row) => !row.statut || row.statut === 'A_FAIRE'}
              emptyLabel="Aucune action pour cette cause."
              fields={fields}
              locked={terminee}
              lockedLabel={() => 'Action terminée : elle ne se modifie plus.'}
              newRow={cause ? () => ({ cause_id: id, description: '', type_action: '', responsable_id: '', echeance: '', cout_estime: '', risque_id: '', critere_efficacite: '' }) : undefined}
              readOnly={readOnly}
              rows={rows}
              title={(row) => row.description || 'Nouvelle action'}
              onChange={(next) => remplacer(id, next)}
            />
          </section>
        )
      })}

      {draft.actions.length > 0 && <p className="fiche-section__muted">Coût total estimé du plan : <strong>{formatFcfa(total)}</strong> (repris en coût B à la section 9).</p>}
    </div>
  )
}
