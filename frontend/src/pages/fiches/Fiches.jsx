import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import Alert from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import DataTable from '../../components/common/DataTable.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import FilterBar from '../../components/common/FilterBar.jsx'
import Icon from '../../components/common/Icon.jsx'
import ListPagination from '../../components/common/ListPagination.jsx'
import EtapeBadge, { ConfidentialiteBadge } from '../../components/fiche/EtapeBadge.jsx'
import { ficheService } from '../../services/ficheService.js'
import { ETAPES } from '../../utils/constants.js'
import { formatDate } from '../../utils/format.js'
import { downloadExcel } from '../../utils/listTools.js'
import AdminFiches from './AdminFiches.jsx'
import './Fiches.css'

const initialFilters = { q: '', statut_etape: '', unite_id: '', type_amelioration: '', origine_id: '', confidentialite: '', date_debut: '', date_fin: '' }
function Registre() {
  const { activeProfile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState(() => ({ ...initialFilters, q: searchParams.get('q') ?? '' }))
  const [sort, setSort] = useState({ tri: 'created_at', ordre: 'desc' })
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [result, setResult] = useState(null)
  const [exporting, setExporting] = useState(false)
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
  async function exportFilteredFiches() {
    setExporting(true)
    setError('')
    try {
      const params = Object.fromEntries(Object.entries({ ...filters, ...sort, page: 1, per_page: 100 }).filter(([, value]) => value !== ''))
      const firstPage = await ficheService.list(params)
      const rows = [...firstPage.data]
      for (let currentPage = 2; currentPage <= firstPage.meta.last_page; currentPage += 1) {
        rows.push(...(await ficheService.list({ ...params, page: currentPage })).data)
      }
      downloadExcel('registre-fiches-a3.xlsx', [
        { label: 'N° A3', value: (fiche) => fiche.numero_a3 },
        { label: 'Titre', value: (fiche) => fiche.titre },
        { label: 'Unité', value: (fiche) => fiche.unite },
        { label: 'Pilote', value: (fiche) => fiche.pilote ?? 'Non désigné' },
        { label: 'Étape', value: (fiche) => fiche.statut_etape_libelle },
        { label: 'Date cible', value: (fiche) => fiche.date_cible ? formatDate(fiche.date_cible) : '—' },
        { label: 'Confidentialité', value: (fiche) => fiche.confidentialite },
        { label: 'Ancienneté (jours)', value: (fiche) => fiche.anciennete_jours },
      ], rows)
    } catch (exportError) {
      setError(`L’export a échoué : ${exportError.message}`)
    } finally {
      setExporting(false)
    }
  }
  const select = (field, label, options) => (
    <label className="fiches-page__filter">
      <span>{label}</span>
      <select value={filters[field]} onChange={setFilter(field)}>
        <option value="">Tous</option>
        {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </label>
  )
  const columns = [
    {
      key: 'numero_a3',
      label: 'N° A3',
      width: '140px',
      header: <button type="button" onClick={() => toggleSort('numero_a3')}>N° A3{sort.tri === 'numero_a3' && (sort.ordre === 'asc' ? ' ▲' : ' ▼')}</button>,
      render: (fiche) => <Link to={`/fiches/${fiche.id}`} onClick={(event) => event.stopPropagation()}>{fiche.numero_a3}</Link>,
    },
    {
      key: 'titre',
      label: 'Titre',
      width: '240px',
      titleValue: (fiche) => fiche.titre,
      render: (fiche) => <span className="data-table__cell-text" title={fiche.titre}>{fiche.titre}</span>,
    },
    {
      key: 'unite',
      label: 'Unité',
      width: '140px',
      titleValue: (fiche) => fiche.unite,
      render: (fiche) => <span className="data-table__cell-text" title={fiche.unite}>{fiche.unite}</span>,
    },
    {
      key: 'pilote',
      label: 'Pilote',
      width: '180px',
      render: (fiche) => (
        <span className="fiches-page__pilote" title={fiche.pilote ?? 'Non désigné'}>
          <span aria-hidden="true" className="sar-avatar sar-avatar--sm">{fiche.pilote ? fiche.pilote.split(' ').map((part) => part[0]).join('').slice(0, 2) : '?'}</span>
          <span className="data-table__cell-text">{fiche.pilote ?? <span className="fiches-page__muted">Non désigné</span>}</span>
        </span>
      ),
    },
    {
      key: 'etape',
      label: 'Étape',
      width: '150px',
      render: (fiche) => <EtapeBadge etape={fiche.statut_etape} />,
    },
    {
      key: 'date_cible',
      label: 'Date cible',
      width: '120px',
      header: <button type="button" onClick={() => toggleSort('date_cible')}>Date cible{sort.tri === 'date_cible' && (sort.ordre === 'asc' ? ' ▲' : ' ▼')}</button>,
      render: (fiche) => fiche.en_retard
        ? <span className="fiches-page__late"><Icon name="clock" size={15} />{formatDate(fiche.date_cible)}</span>
        : formatDate(fiche.date_cible),
    },
    {
      key: 'confidentialite',
      label: 'Confidentialité',
      width: '140px',
      render: (fiche) => <ConfidentialiteBadge value={fiche.confidentialite} />,
    },
    {
      key: 'created_at',
      label: 'Ancienneté',
      width: '120px',
      header: <button type="button" onClick={() => toggleSort('created_at')}>Ancienneté{sort.tri === 'created_at' && (sort.ordre === 'asc' ? ' ▲' : ' ▼')}</button>,
      render: (fiche) => `${fiche.anciennete_jours} j`,
    },
  ]

  return (
    <section className="fiches-page">
      <header className="sar-page-head">
        <h1>Fiches</h1>
        {canDeclare && <Button type="button" onClick={() => navigate('/fiches/nouvelle')}><Icon name="plus" />Nouvelle fiche</Button>}
      </header>
      <div className="sar-card fiches-page__card">
        <FilterBar className="fiches-page__filterbar">
          <div className="fiches-page__filterbar-primary">
            <label className="fiches-page__search" htmlFor="fiches-search">
              <span>Recherche</span>
              <input id="fiches-search" placeholder="N°, titre, unité, pilote…" type="search" value={filters.q} onChange={setFilter('q')} />
            </label>
            <div className="fiches-page__filterbar-tools">
              <span className="fiches-page__result-count">{result?.meta.total ?? 0} résultat{result?.meta.total === 1 ? '' : 's'}</span>
              {activeFilters.length > 0 && <Button type="button" variant="secondary" onClick={() => { setFilters(initialFilters); setPage(1) }}>Réinitialiser</Button>}
              <Button disabled={exporting || !result?.meta.total} type="button" variant="secondary" onClick={exportFilteredFiches}>
                <Icon name="download" size={16} />{exporting ? 'Préparation…' : 'Exporter Excel'}
              </Button>
            </div>
          </div>
          <div className="fiches-page__filters">
            {select('statut_etape', 'Étape', Object.entries(ETAPES).map(([code, etape]) => [code, etape.label]))}
            {select('unite_id', 'Unité', (refs?.unites ?? []).map((unite) => [unite.id, unite.libelle]))}
            {select('type_amelioration', 'Type', (refs?.listes?.type_amelioration ?? []).map((valeur) => [valeur.code, valeur.libelle]))}
            {select('origine_id', 'Origine', (refs?.listes?.origine ?? []).map((valeur) => [valeur.id, valeur.libelle]))}
            {select('confidentialite', 'Confidentialité', [['NORMAL', 'Normal'], ['RESTREINT', 'Restreint']])}
            <label className="fiches-page__filter"><span>Début</span><input type="date" value={filters.date_debut} onChange={setFilter('date_debut')} /></label>
            <label className="fiches-page__filter"><span>Fin</span><input type="date" value={filters.date_fin} onChange={setFilter('date_fin')} /></label>
          </div>
        </FilterBar>
        {error && <Alert severity="error">{error}</Alert>}
        {!result && !error && <DataTable columns={columns} loading rows={[]} variant="compact" />}
        {result && result.data.length === 0 && (
          <EmptyState description={activeFilters.length ? 'Réinitialisez les filtres pour élargir la recherche.' : 'Aucune fiche visible pour ce profil.'} title="Aucune fiche ne correspond à vos critères" />
        )}
        {result && result.data.length > 0 && (
          <DataTable
            columns={columns}
            onRowClick={(fiche) => navigate(`/fiches/${fiche.id}`)}
            rows={result.data}
            variant="compact"
          />
        )}
        {result && result.meta.total > 0 && (
          <ListPagination
            page={page}
            pageSize={perPage}
            total={result.meta.total}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPerPage(size); setPage(1) }}
          />
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
