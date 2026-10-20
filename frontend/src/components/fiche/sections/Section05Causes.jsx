import Badge from '../../ui/Badge.jsx'
import { Checkbox, Select, TextInput } from '../../ui/FormControls.jsx'
import Astuce from './Astuce.jsx'
import CardsEditor from './CardsEditor.jsx'
import { CellInput, CellSelect } from './RowsEditor.jsx'
import { listOptions } from './options.js'
import './FicheSection.css'

const AIDES = {
  '5_POURQUOI': 'Partez du problème et demandez « pourquoi ? » jusqu’à la cause sur laquelle vous pouvez agir. Chaque réponse est une cause, le niveau donne sa place dans la chaîne ; la dernière est souvent la cause racine.',
  ISHIKAWA: 'Passez en revue les 5M (main-d’œuvre, matière, matériel, méthode, milieu) et la mesure : notez chaque cause possible dans sa catégorie, puis vérifiez-les sur le terrain avant de cocher les racines.',
  PARETO: 'Classez les causes par fréquence ou par coût : les deux ou trois premières expliquent souvent 80 % du problème. Cochez-les comme causes racines.',
  AUTRE: 'Précisez la méthode utilisée et listez les causes trouvées.',
}

export default function Section05Causes({ draft, set, refs, readOnly }) {
  const categories = listOptions(refs, 'categorie_cause')
  const cinqPourquoi = draft.methode_analyse === '5_POURQUOI'
  const chaine = [...draft.causes].filter((cause) => cause.libelle).sort((a, b) => Number(a.niveau) - Number(b.niveau))
  const racines = draft.causes.filter((cause) => cause.racine).length

  return (
    <div className="fiche-section">
      <Astuce ouvert={!readOnly && draft.causes.length === 0} titre="Astuce : trouver la cause racine">
        <p>Une cause racine est celle qui, supprimée, empêche le problème de revenir. Appuyez-la sur une preuve (relevé, photo, essai) : c’est elle que le plan d’actions doit traiter.</p>
      </Astuce>

      <div className="fiche-section__grid">
        <Select label="Méthode d’analyse" options={listOptions(refs, 'methode_analyse')} readOnly={readOnly} required value={draft.methode_analyse} onChange={(value) => set('methode_analyse', value)} />
        {draft.methode_analyse === 'AUTRE' && (
          <TextInput label="Méthode précisée" readOnly={readOnly} required value={draft.methode_precision} onChange={(value) => set('methode_precision', value)} />
        )}
      </div>
      {AIDES[draft.methode_analyse] && <p className="fiche-section__help">{AIDES[draft.methode_analyse]}</p>}

      <h3>Causes {draft.causes.length > 0 && <span className="fiche-section__muted">· {racines} racine{racines > 1 ? 's' : ''} sur {draft.causes.length}</span>}</h3>
      {draft.causes.length > 0 && racines === 0 && <p className="fiche-section__warning">Cochez au moins une cause racine : le plan d’actions devra la traiter.</p>}

      <CardsEditor
        addLabel="Ajouter une cause"
        badges={(row) => row.racine && <Badge tone="brand">Cause racine</Badge>}
        emptyLabel="Aucune cause identifiée."
        fields={[
          { key: 'libelle', label: cinqPourquoi ? 'Pourquoi ? *' : 'Cause *', wide: true, render: (row, setRow) => <CellInput placeholder={cinqPourquoi ? 'Parce que…' : 'Ex. : aucun plan d’inspection des purgeurs'} readOnly={readOnly} value={row.libelle} onChange={(value) => setRow('libelle', value)} /> },
          { key: 'categorie', label: 'Catégorie *', render: (row, setRow) => <CellSelect options={categories} readOnly={readOnly} value={row.categorie} onChange={(value) => setRow('categorie', value)} /> },
          { key: 'niveau', label: cinqPourquoi ? 'Niveau du pourquoi' : 'Niveau', render: (row, setRow) => <CellInput max="10" min="1" readOnly={readOnly} type="number" value={row.niveau} onChange={(value) => setRow('niveau', value)} /> },
          { key: 'racine', label: 'Cause racine', render: (row, setRow) => <Checkbox checked={row.racine} label="Oui, c’est une cause racine" readOnly={readOnly} onChange={(value) => setRow('racine', value)} /> },
          { key: 'preuve', label: 'Preuve', wide: true, render: (row, setRow) => <CellInput placeholder="Relevé, photo, essai, référence du constat…" readOnly={readOnly} value={row.preuve} onChange={(value) => setRow('preuve', value)} /> },
        ]}
        newRow={() => ({ categorie: '', libelle: '', niveau: String(draft.causes.length + 1), racine: false, preuve: '' })}
        readOnly={readOnly}
        rows={draft.causes}
        title={(_, index) => `Cause n° ${index + 1}`}
        onChange={(rows) => set('causes', rows)}
      />

      {cinqPourquoi && chaine.length > 0 && (
        <>
          <h3>Chaîne des « 5 Pourquoi »</h3>
          <ol className="fiche-section__chain">
            {chaine.map((cause, index) => (
              <li key={cause.id ?? index}>
                <strong>Pourquoi {cause.niveau}</strong> : {cause.libelle}{cause.racine && <strong> · cause racine</strong>}
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}
