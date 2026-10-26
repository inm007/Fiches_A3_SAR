import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { apiRequest } from '../../auth/api.js'
import { useAuth } from '../../auth/useAuth.js'
import AdminFicheModal from '../../components/fiche/AdminFicheModal.jsx'
import EtapeBadge, { ConfidentialiteBadge } from '../../components/fiche/EtapeBadge.jsx'
import { DateRangeFilter, FilterSelect, ListToolbar, ResultCount, SearchField, ToolbarActions } from '../../components/shared/ListToolbar.jsx'
import PageBanner from '../../components/shared/PageBanner.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Icon from '../../components/ui/Icon.jsx'
import ListPagination from '../../components/ui/ListPagination.jsx'
import { useListFilters } from '../../hooks/useListFilters.js'
import { ficheService } from '../../services/ficheService.js'
import { ETAPES } from '../../utils/constants.js'
import { formatDate } from '../../utils/format.js'
import { downloadExcel, matchesSearch, paginate } from '../../utils/listTools.js'
import { toast } from '../../utils/toast.js'
import './Fiches.css'

// Une seule page « Fiches » pour tous les profils. Les données viennent de la même API qu'avant :
// /fiches (registre filtré par le serveur selon le profil) ou /admin/fiches pour l'administrateur
// fonctionnel, qui seul voit l'action « Gérer » (pilote et confidentialité).

const ETAPE_OPTIONS = Object.entries(ETAPES).map(([code, etape]) => [code, etape.label])
const CONFIDENTIALITE_OPTIONS = [['NORMAL', 'Normal'], ['RESTREINT', 'Restreint']]
const REGISTRE_FILTERS = { q: '', statut_etape: '', unite_id: '', equipement_id: '', type_amelioration: '', origine_id: '', confidentialite: '', date_debut: '', date_fin: '' }
const ADMIN_FILTERS = { q: '', statut_etape: '', confidentialite: '' }

const personName = (pilote) => (pilote ? `${pilote.prenom} ${pilote.nom}` : null)
const initials = (name) => (name ? name.split(' ').map((part) => part[0]).join('').slice(0, 2) : '?')
const withoutEmpty = (values) => Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ''))

/** Registre servi par /fiches : filtres, tri et pagination côté serveur. */
function useRegistre({ enabled, filters, sort, page, perPage }) {
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) return undefined
    let active = true
    const timer = setTimeout(() => {
      ficheService.list(withoutEmpty({ ...filters, ...sort, page, per_page: perPage }))
        .then((data) => { if (active) { setResult(data); setError('') } })
        .catch((loadError) => { if (active) setError(loadError.message) })
    }, filters.q ? 300 : 0)
    return () => { active = false; clearTimeout(timer) }
  }, [enabled, filters, sort, page, perPage])

  async function exportRows() {
    const params = withoutEmpty({ ...filters, ...sort, page: 1, per_page: 100 })
    const firstPage = await ficheService.list(params)
    const rows = [...firstPage.data]
    for (let currentPage = 2; currentPage <= firstPage.meta.last_page; currentPage += 1) {
      rows.push(...(await ficheService.list({ ...params, page: currentPage })).data)
    }
    return rows
  }

  return {
    rows: result?.data.map((fiche) => ({ ...fiche, piloteNom: fiche.pilote ?? null })) ?? [],
    total: result?.meta.total ?? 0,
    loading: !result && !error,
    error,
    exportRows,
    exportColumns: [
      { label: 'N° A3', value: (fiche) => fiche.numero_a3 },
      { label: 'Titre', value: (fiche) => fiche.titre },
      { label: 'Unité', value: (fiche) => fiche.unite },
      { label: 'Équipement', value: (fiche) => fiche.equipement ?? '—' },
      { label: 'Pilote', value: (fiche) => fiche.pilote ?? 'Non désigné' },
      { label: 'Étape', value: (fiche) => fiche.statut_etape_libelle },
      { label: 'Date cible', value: (fiche) => fiche.date_cible ? formatDate(fiche.date_cible) : '—' },
      { label: 'Confidentialité', value: (fiche) => fiche.confidentialite },
      { label: 'Ancienneté (jours)', value: (fiche) => fiche.anciennete_jours },
    ],
  }
}

/** Registre administrateur servi par /admin/fiches : liste complète filtrée dans le navigateur. */
function useAdminRegistre({ enabled, filters, page, perPage }) {
  const [fiches, setFiches] = useState(null)
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) return undefined
    let cancelled = false
    Promise.all([apiRequest('/admin/fiches'), apiRequest('/admin/users')])
      .then(([fichesResult, usersResult]) => {
        if (!cancelled) { setFiches(fichesResult.data); setUsers(usersResult.data) }
      })
      .catch((loadError) => { if (!cancelled) setError(loadError.message) })
    return () => { cancelled = true }
  }, [enabled])

  const filtered = useMemo(() => (fiches ?? []).filter((fiche) => (
    matchesSearch([fiche.numero_a3, fiche.titre, fiche.unite?.libelle, personName(fiche.pilote), fiche.statut_etape, fiche.statut_general, fiche.confidentialite], filters.q)
    && (!filters.statut_etape || fiche.statut_etape === filters.statut_etape)
    && (!filters.confidentialite || fiche.confidentialite === filters.confidentialite)
  )), [fiches, filters])
  const visible = paginate(filtered, page, perPage)

  return {
    rows: visible.rows.map((fiche) => ({ ...fiche, unite: fiche.unite?.libelle ?? '—', piloteNom: [personName(fiche.pilote), ...(fiche.copilotes ?? []).map(personName)].filter(Boolean).join(', ') || null, source: fiche })),
    total: filtered.length,
    currentPage: visible.page,
    loading: fiches === null && !error,
    error,
    users,
    exportRows: async () => filtered,
    exportColumns: [
      { label: 'N° A3', value: (fiche) => fiche.numero_a3 },
      { label: 'Titre', value: (fiche) => fiche.titre },
      { label: 'Unité', value: (fiche) => fiche.unite?.libelle },
      { label: 'Pilote', value: (fiche) => personName(fiche.pilote) ?? 'Non désigné' },
      { label: 'Étape', value: (fiche) => fiche.statut_etape },
      { label: 'Confidentialité', value: (fiche) => fiche.confidentialite },
    ],
    replace: (updated) => setFiches((current) => current.map((fiche) => (fiche.id === updated.id ? updated : fiche))),
  }
}

function SortHeader({ field, label, sort, onSort }) {
  const active = sort.tri === field
  return (
    <button aria-label={`Trier par ${label}`} className="fiches-page__sort" type="button" onClick={() => onSort(field)}>
      {label}
      <Icon className={active ? 'is-active' : undefined} name={active && sort.ordre === 'asc' ? 'arrow-up' : 'arrow-down'} size={12} />
    </button>
  )
}

function Fiches() {
  const { activeProfile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isAdmin = activeProfile?.role_code === 'ADMIN_FONCTIONNEL'
  const canDeclare = Boolean(activeProfile?.permissions?.includes('DECLARER_FICHE'))
  const initialFilters = isAdmin ? ADMIN_FILTERS : REGISTRE_FILTERS

  const list = useListFilters(initialFilters, () => ({
    ...initialFilters,
    q: searchParams.get('q') ?? '',
    ...(isAdmin ? {} : { unite_id: searchParams.get('unite_id') ?? '', equipement_id: searchParams.get('equipement_id') ?? '' }),
  }))
  const { filters, page, pageSize: perPage, setFilter, setPage } = list
  const [sort, setSort] = useState({ tri: 'created_at', ordre: 'desc' })
  const [refs, setRefs] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [managed, setManaged] = useState(null)

  const registre = useRegistre({ enabled: !isAdmin, filters, sort, page, perPage })
  const admin = useAdminRegistre({ enabled: isAdmin, filters, page, perPage })
  const source = isAdmin ? admin : registre

  useEffect(() => {
    if (isAdmin) return
    ficheService.referentiels().then(setRefs).catch(() => setRefs(null))
  }, [isAdmin])

  const equipementOptions = (refs?.equipements ?? [])
    .filter((equipement) => !filters.unite_id || String(equipement.unite_id) === String(filters.unite_id))
    .map((equipement) => [equipement.id, `${equipement.code} — ${equipement.libelle}`])

  const toggleSort = (tri) => setSort((current) => ({ tri, ordre: current.tri === tri && current.ordre === 'desc' ? 'asc' : 'desc' }))

  async function exportList() {
    setExporting(true)
    setExportError('')
    try {
      downloadExcel('registre-fiches-a3.xlsx', source.exportColumns, await source.exportRows())
    } catch (error) {
      setExportError(`L’export a échoué : ${error.message}`)
    } finally {
      setExporting(false)
    }
  }

  const columns = [
    {
      key: 'numero_a3',
      label: 'N° A3',
      width: '128px',
      header: isAdmin ? undefined : <SortHeader field="numero_a3" label="N° A3" sort={sort} onSort={toggleSort} />,
      render: (fiche) => <Link className="fiches-page__number" to={`/fiches/${fiche.id}`} onClick={(event) => event.stopPropagation()}>{fiche.numero_a3}</Link>,
    },
    {
      key: 'titre',
      label: 'Fiche',
      render: (fiche) => (
        <span className="fiches-page__titre">
          <strong title={fiche.titre}>{fiche.titre}</strong>
          <small>{fiche.equipement ? `${fiche.unite} · ${fiche.equipement}` : fiche.unite}</small>
        </span>
      ),
    },
    {
      key: 'pilote',
      label: 'Pilote',
      width: '150px',
      render: (fiche) => (
        <span className="fiches-page__pilote" title={fiche.piloteNom ?? 'Non désigné'}>
          <span aria-hidden="true" className="sar-avatar sar-avatar--sm">{initials(fiche.piloteNom)}</span>
          <span className="data-table__cell-text">{fiche.piloteNom ?? <span className="sar-muted">Non désigné</span>}</span>
        </span>
      ),
    },
    {
      key: 'etape',
      label: 'Étape',
      width: '204px',
      render: (fiche) => <EtapeBadge etape={fiche.statut_etape} />,
    },
    ...(isAdmin ? [] : [{
      key: 'date_cible',
      label: 'Date cible',
      width: '132px',
      header: <SortHeader field="date_cible" label="Date cible" sort={sort} onSort={toggleSort} />,
      render: (fiche) => (fiche.en_retard
        ? <span className="fiches-page__late" title="Date cible dépassée"><Icon name="clock" size={14} />{formatDate(fiche.date_cible)}</span>
        : <span className="sar-num">{formatDate(fiche.date_cible)}</span>),
    }]),
    {
      key: 'confidentialite',
      label: 'Confidentialité',
      width: '136px',
      render: (fiche) => <ConfidentialiteBadge value={fiche.confidentialite} />,
    },
    ...(isAdmin ? [] : [{
      key: 'created_at',
      label: 'Ancienneté',
      width: '124px',
      header: <SortHeader field="created_at" label="Ancienneté" sort={sort} onSort={toggleSort} />,
      render: (fiche) => <span className="sar-num">{fiche.anciennete_jours} j</span>,
    }]),
  ]

  return (
    <section className="fiches-page">
      <PageBanner
        actions={canDeclare && <Button icon="plus" type="button" onClick={() => navigate('/fiches/nouvelle')}>Nouvelle fiche</Button>}
        description={isAdmin ? 'Consultation des fiches, désignation du pilote et gestion de la confidentialité. Le contenu métier reste en lecture seule.' : undefined}
        title="Fiches"
      />

      <ListToolbar>
        <SearchField id="fiches-search" label="Recherche" placeholder="N°, titre, unité, équipement, pilote…" value={filters.q} onChange={setFilter('q')} />
        <FilterSelect label="Étape" options={ETAPE_OPTIONS} value={filters.statut_etape} onChange={setFilter('statut_etape')} />
        {!isAdmin && (
          <>
            <FilterSelect label="Unité" options={(refs?.unites ?? []).map((unite) => [unite.id, unite.libelle])} value={filters.unite_id} onChange={(value) => list.updateFilters({ unite_id: value, equipement_id: '' })} />
            <FilterSelect label="Équipement" options={equipementOptions} value={filters.equipement_id} onChange={setFilter('equipement_id')} />
            <FilterSelect allLabel="Tous" label="Type" options={(refs?.listes?.type_amelioration ?? []).map((valeur) => [valeur.code, valeur.libelle])} value={filters.type_amelioration} onChange={setFilter('type_amelioration')} />
            <FilterSelect label="Origine" options={(refs?.listes?.origine ?? []).map((valeur) => [valeur.id, valeur.libelle])} value={filters.origine_id} onChange={setFilter('origine_id')} />
          </>
        )}
        <FilterSelect label="Confidentialité" options={CONFIDENTIALITE_OPTIONS} value={filters.confidentialite} onChange={setFilter('confidentialite')} />
        {!isAdmin && (
          <>
            <DateRangeFilter
              from={filters.date_debut}
              label="Création"
              to={filters.date_fin}
              onChange={({ from, to }) => list.updateFilters({ date_debut: from, date_fin: to })}
            />
          </>
        )}
        <ToolbarActions>
          <ResultCount count={source.total} singular="fiche" />
          {list.active && <Button type="button" variant="ghost" onClick={list.reset}>Réinitialiser</Button>}
          <Button disabled={!source.total} icon="download" loading={exporting} loadingLabel="Préparation…" type="button" variant="secondary" onClick={exportList}>Exporter Excel</Button>
        </ToolbarActions>
      </ListToolbar>

      {(source.error || exportError) && <Alert severity="error">{source.error || exportError}</Alert>}

      {!source.error && (
        <DataTable
          actions={isAdmin ? (fiche) => (
            <div className="sar-list-actions">
              <Button size="small" type="button" variant="secondary" onClick={(event) => { event.stopPropagation(); navigate(`/fiches/${fiche.id}`) }}>Ouvrir</Button>
              <Button size="small" type="button" variant="secondary" onClick={(event) => { event.stopPropagation(); setManaged(fiche.source) }}>Gérer</Button>
            </div>
          ) : undefined}
          actionsWidth="168px"
          columns={columns}
          emptyAction={list.active
            ? <Button type="button" variant="secondary" onClick={list.reset}>Réinitialiser les filtres</Button>
            : canDeclare && <Button icon="plus" type="button" onClick={() => navigate('/fiches/nouvelle')}>Déclarer une fiche</Button>}
          emptyDescription={list.active ? 'Aucune fiche ne correspond à ces critères.' : 'Aucune fiche n’est visible pour ce profil.'}
          emptyMessage="Aucune fiche"
          loading={source.loading}
          rows={source.rows}
          variant="compact"
          onRowClick={(fiche) => navigate(`/fiches/${fiche.id}`)}
        />
      )}

      {source.total > 0 && (
        <ListPagination
          page={isAdmin ? admin.currentPage : page}
          pageSize={perPage}
          total={source.total}
          onPageChange={setPage}
          onPageSizeChange={list.changePageSize}
        />
      )}

      {isAdmin && managed && (
        <AdminFicheModal
          fiche={managed}
          key={managed.id}
          users={admin.users}
          onClose={() => setManaged(null)}
          onSaved={(updated) => { admin.replace(updated); setManaged(null); toast('Modifications enregistrées') }}
          onShared={(updated) => { admin.replace(updated); setManaged(updated) }}
        />
      )}
    </section>
  )
}

// Un changement de profil actif repart d'un état propre (filtres et source de données).
function FichesPage() {
  const { activeProfile } = useAuth()
  return <Fiches key={activeProfile?.affectation_id ?? activeProfile?.role_code} />
}

export default FichesPage
