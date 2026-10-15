import { Checkbox, Select, TextInput } from '../../ui/FormControls.jsx'
import RowsEditor, { CellInput, CellSelect } from './RowsEditor.jsx'
import { listOptions } from './options.js'
import './FicheSection.css'

export default function Section05Causes({ draft, set, refs, readOnly }) {
  const categories = listOptions(refs, 'categorie_cause')
  const cinqPourquoi = draft.methode_analyse === '5_POURQUOI'
  const chaine = [...draft.causes].filter((cause) => cause.libelle).sort((a, b) => Number(a.niveau) - Number(b.niveau))

  return (
    <div className="fiche-section">
      <p className="fiche-section__help">Choisissez la méthode et listez les causes ; cochez les causes racines.</p>
      <div className="fiche-section__grid">
        <Select label="Méthode d’analyse" options={listOptions(refs, 'methode_analyse')} readOnly={readOnly} required value={draft.methode_analyse} onChange={(value) => set('methode_analyse', value)} />
        {draft.methode_analyse === 'AUTRE' && (
          <TextInput label="Méthode précisée" readOnly={readOnly} required value={draft.methode_precision} onChange={(value) => set('methode_precision', value)} />
        )}
      </div>
      <RowsEditor
        addLabel="Ajouter une cause"
        columns={[
          { key: 'numero', label: 'N°', width: 40, render: (row) => row.numero ?? '—' },
          { key: 'categorie', label: 'Catégorie *', width: 140, render: (row, setRow) => <CellSelect options={categories} readOnly={readOnly} value={row.categorie} onChange={(value) => setRow('categorie', value)} /> },
          { key: 'libelle', label: 'Libellé *', width: 260, render: (row, setRow) => <CellInput readOnly={readOnly} value={row.libelle} onChange={(value) => setRow('libelle', value)} /> },
          { key: 'niveau', label: 'Niveau', width: 70, render: (row, setRow) => <CellInput max="10" min="1" readOnly={readOnly} type="number" value={row.niveau} onChange={(value) => setRow('niveau', value)} /> },
          { key: 'racine', label: 'Racine', width: 60, render: (row, setRow) => <Checkbox checked={row.racine} label="" readOnly={readOnly} onChange={(value) => setRow('racine', value)} /> },
          { key: 'preuve', label: 'Preuve', width: 180, render: (row, setRow) => <CellInput readOnly={readOnly} value={row.preuve} onChange={(value) => setRow('preuve', value)} /> },
        ]}
        emptyLabel="Aucune cause identifiée."
        newRow={() => ({ categorie: '', libelle: '', niveau: String(draft.causes.length + 1), racine: false, preuve: '' })}
        readOnly={readOnly}
        rows={draft.causes}
        onChange={(rows) => set('causes', rows)}
      />
      {cinqPourquoi && chaine.length > 0 && (
        <>
          <h3>Chaîne des « 5 Pourquoi »</h3>
          <ol className="fiche-section__chain">
            {chaine.map((cause, index) => (
              <li key={cause.id ?? index}>
                <strong>Niveau {cause.niveau}</strong> — {cause.libelle}{cause.racine && <strong> · cause racine</strong>}
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}
