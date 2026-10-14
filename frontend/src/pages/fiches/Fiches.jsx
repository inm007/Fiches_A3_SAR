import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import Alert from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Icon from '../../components/common/Icon.jsx'
import Skeleton from '../../components/common/Skeleton.jsx'
import EtapeBadge, { ConfidentialiteBadge } from '../../components/fiche/EtapeBadge.jsx'
import { ficheService } from '../../services/ficheService.js'
import { ETAPES } from '../../utils/constants.js'
import { formatDate } from '../../utils/format.js'
import AdminFiches from './AdminFiches.jsx'
import './Fiches.css'

const initialFilters = { q: '', statut_etape: '', unite_id: '', type_amelioration: '', origine_id: '', confidentialite: '', date_debut: '', date_fin: '' }
const sortable = { numero_a3: 'N° A3', date_cible: 'Date cible', created_at: 'Ancienneté' }

function Registre() {
  const { activeProfile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState(() => ({ ...initialFilters, q: searchParams.get('q') ?? '' }))
  const [sort, setSort] = useState({ tri: 'created_at', ordre: 'desc' })
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [result, setResult] = useState(null)
  const [refs, setRefs] = useState(null)
  const [error, setError] = useState('')
  const canDeclare = ['AGENT', 'PILOTE'].includes(activeProfile?.role_code)

  useEffect(() => { ficheService.referentiels().then(setRefs).catch(() => setRefs(null)) }, [])

  useEffect(() => {
    let active = true
    const params = Object.fromEntries(Object.entries({ ...filters, ...sort, page, per_page: perPage }).filter(([, value]) => value !== ''))
    const timer = setTimeout(() => {
      ficheService.list(params)
        .then((data) => { if (active) { setResult(data); setError('') } })
        .catch((loadError) => { if (active) setError(loadError.message) })
    }, filters.q ? 300 : 0)
    return () => { active = false; clearTimeout(timer) }
  }, [filters, sort, page, perPage])

  const setFilter = (field) => (event) => { setPage(1); setFilters((current) => ({ ...current, [field]: event.target.value })) }
  const toggleSort = (tri) => setSort((current) => ({ tri, ordre: current.tri === tri && current.ordre === 'desc' ? 'asc' : 'desc' }))
  const activeFilters = Object.entries(filters).filter(([, value]) => value !== '')
  const select = (field, label, options) => (
    <label className="fiches-page__filter">
      <span>{label}</span>
      <select value={filters[field]} onChange={setFilter(field)}>
        <option value="">Tous</option>
        {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </label>
  )

  return (
    <section className="fiches-page">
      <header className="sar-page-head">
        <h1>Fiches</h1>
        {canDeclare && <Button type="button" onClick={() => navigate('/fiches/nouvelle')}><Icon name="plus" />Nouvelle fiche</Button>}
      </header>
      <div className="sar-card fiches-page__card">
        <div className="fiches-page__filters">
          <label className="fiches-page__filter fiches-page__filter--search">
            <span>Recherche</span>
            <input placeholder="Numéro ou titre" type="search" value={filters.q} onChange={setFilter('q')} />
          </label>
          {select('statut_etape', 'Étape', Object.entries(ETAPES).map(([code, etape]) => [code, etape.label]))}
          {select('unite_id', 'Unité', (refs?.unites ?? []).map((unite) => [unite.id, unite.libelle]))}
          {select('type_amelioration', 'Type', (refs?.listes?.type_amelioration ?? []).map((valeur) => [valeur.code, valeur.libelle]))}
          {select('origine_id', 'Origine', (refs?.listes?.origine ?? []).map((valeur) => [valeur.id, valeur.libelle]))}
          {select('confidentialite', 'Confidentialité', [['NORMAL', 'Normal'], ['RESTREINT', 'Restreint']])}
          <label className="fiches-page__filter"><span>Du</span><input type="date" value={filters.date_debut} onChange={setFilter('date_debut')} /></label>
          <label className="fiches-page__filter"><span>Au</span><input type="date" value={filters.date_fin} onChange={setFilter('date_fin')} /></label>
          {activeFilters.length > 0 && <Button type="button" variant="secondary" onClick={() => { setFilters(initialFilters); setPage(1) }}>Réinitialiser</Button>}
        </div>
        {error && <Alert severity="error">{error}</Alert>}
        {!result && !error && <div className="fiches-page__loading"><Skeleton /><Skeleton /><Skeleton /></div>}
        {result && result.data.length === 0 && (
          <EmptyState description={activeFilters.length ? 'Réinitialisez les filtres pour élargir la recherche.' : 'Aucune fiche visible pour ce profil.'} title="Aucune fiche ne correspond à vos critères" />
        )}
        {result && result.data.length > 0 && (
          <table className="sar-table fiches-page__table">
            <thead>
              <tr>
                {['numero_a3', 'titre', 'unite', 'pilote', 'etape', 'date_cible', 'confidentialite', 'created_at'].map((key) => (
                  <th key={key} scope="col">
                    {sortable[key]
                      ? <button type="button" onClick={() => toggleSort(key)}>{sortable[key]}{sort.tri === key && (sort.ordre === 'asc' ? ' ▲' : ' ▼')}</button>
                      : { titre: 'Titre', unite: 'Unité', pilote: 'Pilote', etape: 'Étape', confidentialite: 'Confidentialité' }[key]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.data.map((fiche) => (
                <tr className="is-clickable" key={fiche.id} onClick={() => navigate(`/fiches/${fiche.id}`)}>
                  <td><Link to={`/fiches/${fiche.id}`} onClick={(event) => event.stopPropagation()}>{fiche.numero_a3}</Link></td>
                  <td>{fiche.titre}</td>
                  <td>{fiche.unite}</td>
                  <td>
                    <span className="fiches-page__pilote">
                      <span className="sar-avatar sar-avatar--sm">{fiche.pilote ? fiche.pilote.split(' ').map((part) => part[0]).join('').slice(0, 2) : '?'}</span>
                      {fiche.pilote ?? <span className="fiches-page__muted">Non désigné</span>}
                    </span>
                  </td>
                  <td><EtapeBadge etape={fiche.statut_etape} /></td>
                  <td>{fiche.en_retard ? <span className="fiches-page__late"><Icon name="clock" size={15} />{formatDate(fiche.date_cible)}</span> : formatDate(fiche.date_cible)}</td>
                  <td><ConfidentialiteBadge value={fiche.confidentialite} /></td>
                  <td>{fiche.anciennete_jours} j</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {result && result.meta.total > 0 && (
          <footer className="fiches-page__pagination">
            <span>{result.meta.total} fiche(s)</span>
            <label>Lignes <select value={perPage} onChange={(event) => { setPerPage(Number(event.target.value)); setPage(1) }}>{[10, 25, 50, 100].map((size) => <option key={size}>{size}</option>)}</select></label>
            <Button disabled={page <= 1} type="button" variant="secondary" onClick={() => setPage(page - 1)}>Précédent</Button>
            <span>Page {result.meta.page} / {result.meta.last_page}</span>
            <Button disabled={page >= result.meta.last_page} type="button" variant="secondary" onClick={() => setPage(page + 1)}>Suivant</Button>
          </footer>
        )}
      </div>
    </section>
  )
}

function Fiches() {
  const { activeProfile } = useAuth()
  return activeProfile?.role_code === 'ADMIN_FONCTIONNEL' ? <AdminFiches /> : <Registre />
}

export default Fiches
