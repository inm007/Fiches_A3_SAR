import Badge from '../../ui/Badge.jsx'
import JoindrePreuve from '../JoindrePreuve.jsx'
import { STATUTS_SIMPLES } from '../../../utils/constants.js'
import Astuce, { Pastilles } from './Astuce.jsx'
import CardsEditor from './CardsEditor.jsx'
import { CellInput, CellSelect } from './RowsEditor.jsx'
import { listOptions, peopleOptions } from './options.js'
import './FicheSection.css'

const statutTone = { A_FAIRE: 'neutral', EN_COURS: 'warning', REALISE: 'success' }
const PREUVES = {
  SOP: 'Référence et version de la procédure',
  PARAMETRES: 'Consignes modifiées dans le SNCC, fiche de paramètres',
  FORMATION: 'Feuille de présence, support de formation',
  PLAN_MAINTENANCE: 'Gamme ou plan créé dans SAP',
  KPI_TABLEAU_DE_BORD: 'Tableau de bord où le KPI est suivi',
}

export default function Section10Perennisation({ draft, set, fiche, options, refs, readOnly, onFicheChange }) {
  const types = listOptions(refs, 'type_perennisation')
  const libelle = (code) => types.find(([value]) => value === code)?.[1] ?? code
  const presents = draft.perennisation.map((ligne) => ligne.type)
  const ajouterTypes = (codes) => {
    const nouveaux = codes.filter((code) => !presents.includes(code))
    if (nouveaux.length) set('perennisation', [...draft.perennisation, ...nouveaux.map((type) => ({ type, responsable_id: '', date: '', statut: 'A_FAIRE', preuve: '' }))])
  }
  const restantes = draft.perennisation.filter((ligne) => ligne.statut !== 'REALISE').length
  const fichiers = Object.fromEntries(fiche.perennisation.map((ligne) => [ligne.id, ligne.fichiers ?? 0]))
  const sansPreuve = (row) => row.statut === 'REALISE' && !row.preuve?.trim() && !fichiers[row.id]
  const nbSansPreuve = draft.perennisation.filter(sansPreuve).length
  const peutJoindre = fiche.droits.peut_ajouter_piece_jointe

  return (
    <div className="fiche-section">
      <Astuce ouvert={!readOnly && draft.perennisation.length === 0} titre="Astuce : faire durer le résultat">
        <p>Sans standard, le problème revient. Choisissez ce qui fera durer le résultat (procédure, paramètres, formation, plan de maintenance, KPI suivi). Chaque action doit être <strong>réalisée avec sa preuve</strong> avant la clôture : une référence écrite (procédure, gamme, feuille de présence…) ou un document ou une photo joints.</p>
      </Astuce>

      {!readOnly && (
        <>
          <span className="sar-field__label">Ajouter en un geste</span>
          <Pastilles label="Types de pérennisation" options={types} value={presents} onChange={ajouterTypes} />
        </>
      )}
      {draft.perennisation.length > 0 && restantes > 0 && (
        <p className="fiche-section__warning">{restantes} action{restantes > 1 ? 's' : ''} à réaliser avant de soumettre la clôture.</p>
      )}
      {nbSansPreuve > 0 && (
        <p className="fiche-section__warning">{nbSansPreuve} action{nbSansPreuve > 1 ? 's' : ''} réalisée{nbSansPreuve > 1 ? 's' : ''} sans preuve : indiquez la référence ou joignez un document avant de soumettre la clôture.</p>
      )}

      <CardsEditor
        badges={(row) => (
          <>
            <Badge tone={statutTone[row.statut] ?? 'neutral'}>{STATUTS_SIMPLES.find(([code]) => code === row.statut)?.[1] ?? 'À faire'}</Badge>
            {sansPreuve(row) && <Badge tone="error">Preuve manquante</Badge>}
            {fichiers[row.id] > 0 && <Badge tone="neutral">{fichiers[row.id]} fichier{fichiers[row.id] > 1 ? 's' : ''} joint{fichiers[row.id] > 1 ? 's' : ''}</Badge>}
          </>
        )}
        emptyLabel="Aucune action de pérennisation."
        fields={[
          { key: 'type', label: 'Type *', render: (row, setRow) => <CellSelect options={types} readOnly={readOnly} value={row.type} onChange={(value) => setRow('type', value)} /> },
          { key: 'responsable_id', label: 'Responsable', render: (row, setRow) => <CellSelect options={peopleOptions(options?.responsables)} readOnly={readOnly} value={row.responsable_id} onChange={(value) => setRow('responsable_id', value)} /> },
          { key: 'date', label: 'Date', render: (row, setRow) => <CellInput readOnly={readOnly} type="date" value={row.date} onChange={(value) => setRow('date', value)} /> },
          { key: 'statut', label: 'Statut *', render: (row, setRow) => <CellSelect options={STATUTS_SIMPLES} placeholder={null} readOnly={readOnly} value={row.statut} onChange={(value) => setRow('statut', value)} /> },
          { key: 'preuve', label: 'Preuve (référence) *', wide: true, render: (row, setRow) => <CellInput placeholder={PREUVES[row.type] ?? 'Référence du document ou de l’enregistrement'} readOnly={readOnly} value={row.preuve} onChange={(value) => setRow('preuve', value)} /> },
          ...(peutJoindre ? [{
            key: 'fichier',
            label: 'Pièce jointe',
            wide: true,
            render: (row) => (row.id
              ? <JoindrePreuve fiche={fiche} perennisationId={row.id} onJoint={onFicheChange} />
              : <span className="fiche-section__muted">Enregistrez la section pour joindre un fichier.</span>),
          }] : []),
        ]}
        newRow={() => ({ type: '', responsable_id: '', date: '', statut: 'A_FAIRE', preuve: '' })}
        addLabel="Ajouter une autre action"
        readOnly={readOnly}
        rows={draft.perennisation}
        title={(row, index) => (row.type ? libelle(row.type) : `Action ${index + 1}`)}
        onChange={(rows) => set('perennisation', rows)}
      />
    </div>
  )
}
