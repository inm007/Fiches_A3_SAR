import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Alert from '../../components/ui/Alert.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import ListPagination from '../../components/ui/ListPagination.jsx'
import PageBanner from '../../components/shared/PageBanner.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import Tabs from '../../components/ui/Tabs.jsx'
import { FilterSelect, ListToolbar, ResultCount, SearchField, ToolbarActions } from '../../components/shared/ListToolbar.jsx'
import { useListFilters } from '../../hooks/useListFilters.js'
import { capitalisationService } from '../../services/capitalisationService.js'
import { ficheService } from '../../services/ficheService.js'
import { ETAPES, RUBRIQUES_LECONS } from '../../utils/constants.js'
import { formatDate } from '../../utils/format.js'
import './Capitalisation.css'

const PAGE_SIZES = [10, 25, 50]
const NO_FILTERS = { q: '', rubrique: '', unite_id: '' }
const VUES = [
  { key: 'lecons', label: 'Leçons apprises' },
  { key: 'standards', label: 'Standards en place' },
]
const TONS_RUBRIQUE = { A_FONCTIONNE: 'realisation', N_A_PAS_FONCTIONNE: 'attente', STANDARD_A_REPLIQUER: 'maintien', RETOUR_EXPERIENCE: 'validation' }

// Ce que les fiches ont appris (section 11) et les standards réalisés (section 10), toutes
// fiches confondues : on vérifie ici si un problème a déjà été traité avant de repartir de zéro.
function Capitalisation() {
  const [vue, setVue] = useState('lecons')
  const list = useListFilters(NO_FILTERS)
  const { filters, page, pageSize } = list
  const [refs, setRefs] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    ficheService.referentiels().then(setRefs).catch(() => setRefs(null))
  }, [])

  const params = useMemo(() => Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '')), [filters])
  useEffect(() => {
    let current = true
    capitalisationService.list(vue, page, pageSize, params)
      .then((loaded) => { if (current) { setResult(loaded); setError('') } })
      .catch((loadError) => { if (current) setError(loadError.message) })
    return () => { current = false }
  }, [vue, page, pageSize, params])

  function changerVue(next) {
    setVue(next)
    setResult(null)
    list.reset()
  }

  const rubriques = vue === 'lecons'
    ? RUBRIQUES_LECONS
    : (refs?.listes?.type_perennisation ?? []).map((valeur) => [valeur.code, valeur.libelle])
  const libelleRubrique = Object.fromEntries(RUBRIQUES_LECONS)

  return (
    <section className="capitalisation-page">
      <PageBanner
        description="Ce que les fiches ont appris et les standards qu’elles ont mis en place. Cherchez ici avant d’ouvrir une nouvelle fiche : le problème a peut-être déjà été traité."
        title="Leçons et standards"
      />
      <Tabs active={vue} idPrefix="capitalisation" label="Leçons ou standards" tabs={VUES} onChange={changerVue} />
      <div aria-labelledby={`capitalisation-${vue}`} className="capitalisation-page__panel" id={`capitalisation-panel-${vue}`} role="tabpanel">
        <ListToolbar>
          <SearchField placeholder="Mot-clé, n° de fiche, équipement…" value={filters.q} onChange={list.setFilter('q')} />
          <FilterSelect allLabel="Toutes" label={vue === 'lecons' ? 'Rubrique' : 'Type'} options={rubriques} value={filters.rubrique} onChange={list.setFilter('rubrique')} />
          <FilterSelect label="Unité" options={(refs?.unites ?? []).map((unite) => [unite.id, unite.libelle])} value={filters.unite_id} onChange={list.setFilter('unite_id')} />
          <ToolbarActions>
            {result && <ResultCount count={result.meta.total} singular={vue === 'lecons' ? 'leçon' : 'standard'} />}
            {list.active && <Button type="button" variant="secondary" onClick={list.reset}>Réinitialiser</Button>}
          </ToolbarActions>
        </ListToolbar>
        {error && <Alert severity="error">{error}</Alert>}
        {!result && !error && <Skeleton height={22} lines={5} />}
        {result?.data.length === 0 && (
          <div className="sar-card">
            <EmptyState
              action={list.active && <Button type="button" variant="secondary" onClick={list.reset}>Réinitialiser les filtres</Button>}
              description={list.active
                ? 'Rien ne correspond à cette recherche.'
                : vue === 'lecons'
                  ? 'Les leçons apparaissent ici dès qu’un pilote remplit la section 11 de sa fiche.'
                  : 'Les standards apparaissent ici dès qu’une action de pérennisation (section 10) est réalisée.'}
              icon="bulb"
              title={vue === 'lecons' ? 'Aucune leçon' : 'Aucun standard'}
            />
          </div>
        )}
        {result?.data.length > 0 && (
          <ul className="capitalisation-page__grid">
            {result.data.map((element) => {
              const etape = ETAPES[element.fiche.statut_etape]
              return (
                <li className="capitalisation-card" key={element.id}>
                  <div className="capitalisation-card__head">
                    <Badge tone={vue === 'lecons' ? (TONS_RUBRIQUE[element.rubrique] ?? 'neutral') : 'maintien'}>
                      {vue === 'lecons' ? (libelleRubrique[element.rubrique] ?? element.rubrique) : element.libelle}
                    </Badge>
                    <span className="sar-num">{formatDate(element.date)}</span>
                  </div>
                  <p className="capitalisation-card__texte">
                    {element.texte || <span className="sar-muted">Aucune référence de preuve renseignée.</span>}
                  </p>
                  <Link className="capitalisation-card__fiche" to={`/fiches/${element.fiche.id}`}>
                    <strong>{element.fiche.numero_a3}</strong>
                    <span>{element.fiche.titre}</span>
                  </Link>
                  <p className="capitalisation-card__meta">
                    {[element.fiche.unite, element.fiche.equipement, etape?.label].filter(Boolean).join(' · ')}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
        {result && result.meta.total > 0 && (
          <ListPagination
            page={result.meta.page}
            pageSize={pageSize}
            pageSizes={PAGE_SIZES}
            total={result.meta.total}
            onPageChange={list.setPage}
            onPageSizeChange={list.changePageSize}
          />
        )}
      </div>
    </section>
  )
}

export default Capitalisation
