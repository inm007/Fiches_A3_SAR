import { useEffect, useState } from 'react'
import { apiRequest } from '../../auth/api.js'
import AdminEntityPage from '../../components/admin/AdminEntityPage.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Badge from '../../components/ui/Badge.jsx'
import './Listes.css'

const nextOrder = (values) => values.reduce((max, item) => Math.max(max, Number(item.ordre) || 0), 0) + 1

const fields = [
  { name: 'code', label: 'Code', required: true, maxLength: 255 },
  { name: 'libelle', label: 'Libellé', required: true, maxLength: 255 },
  { name: 'ordre', label: 'Ordre', type: 'number', required: true, min: 0, defaultValue: nextOrder },
]

const columns = [
  { key: 'code', label: 'Code', width: '22%', titleValue: (item) => item.code },
  {
    key: 'libelle',
    label: 'Libellé',
    width: '36%',
    titleValue: (item) => item.libelle,
    render: (item) => <span className="data-table__cell-text" title={item.libelle}>{item.libelle}</span>,
  },
  { key: 'ordre', label: 'Ordre', width: '12%' },
  {
    key: 'actif',
    label: 'État',
    width: '14%',
    value: (item) => item.actif ? 'Actif' : 'Inactif',
    render: (item) => <Badge tone={item.actif ? 'active' : 'inactive'}>{item.actif ? 'Actif' : 'Inactif'}</Badge>,
  },
]

const messages = {
  add: 'Ajouter une valeur',
  createTitle: () => 'Ajouter une valeur',
  editTitle: () => 'Modifier une valeur',
  created: 'Valeur ajoutée.',
  updated: 'Valeur mise à jour.',
  activated: 'Valeur activée.',
  deactivated: 'Valeur désactivée.',
  confirmTitle: 'Désactiver cette valeur ?',
  confirmText: 'La valeur restera disponible dans l’historique des fiches, mais ne pourra plus être sélectionnée.',
  empty: 'Aucune valeur dans cette liste.',
}

/** Listes de choix : une colonne pour choisir le référentiel, ses valeurs à droite. */
function Listes() {
  const [lists, setLists] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [listsLoaded, setListsLoaded] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    apiRequest('/admin/lists')
      .then((result) => {
        if (!cancelled) {
          setLists(result.data)
          setSelectedId((current) => current || String(result.data[0]?.id ?? ''))
        }
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message)
      })
      .finally(() => {
        if (!cancelled) setListsLoaded(true)
      })
    return () => { cancelled = true }
  }, [])

  const selected = lists.find((list) => String(list.id) === selectedId)
  const endpoint = selectedId ? `/admin/lists/${selectedId}/values` : null

  return (
    <AdminEntityPage
      columns={columns}
      description="Valeurs proposées dans les fiches. Une valeur déjà utilisée se désactive."
      endpoint={endpoint}
      exportName={`valeurs-${selected?.code ?? 'referentiel'}.xlsx`}
      fields={fields}
      // Changer de référentiel repart d'une liste vierge (recherche, filtres, page).
      key={selectedId}
      messages={messages}
      pending={!listsLoaded}
      reorderEndpoint={endpoint && `${endpoint}/order`}
      searchPlaceholder="Code ou libellé…"
      title="Listes de choix"
      wrapContent={(content) => (
        <div className="listes-page__layout">
          <nav aria-label="Listes de référence" className="listes-page__nav">
            <h2>Référentiels</h2>
            {lists.map((list) => (
              <button
                aria-current={String(list.id) === selectedId ? 'page' : undefined}
                className={String(list.id) === selectedId ? 'is-active' : ''}
                key={list.id}
                onClick={() => setSelectedId(String(list.id))}
                type="button"
              >
                {list.libelle}
              </button>
            ))}
          </nav>
          <section className="listes-page__content">
            {error && <Alert severity="error">{error}</Alert>}
            <header>
              <div>
                <h2>{selected?.libelle ?? 'Valeurs'}</h2>
                <p>{selected?.description}</p>
              </div>
            </header>
            {content}
          </section>
        </div>
      )}
    />
  )
}

export default Listes
