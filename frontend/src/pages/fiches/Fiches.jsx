import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { apiRequest } from '../../auth/api.js'
import { useAuth } from '../../auth/useAuth.js'
import AdminFicheModal from '../../components/fiche/AdminFicheModal.jsx'
import EtapeBadge from '../../components/fiche/EtapeBadge.jsx'
import { DateRangeFilter, FilterSelect, ListToolbar, ResultCount, SearchField, ToolbarActions } from '../../components/shared/ListToolbar.jsx'
import PageBanner from '../../components/shared/PageBanner.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import RowActions from '../../components/ui/RowActions.jsx'
import Icon from '../../components/ui/Icon.jsx'
import ListPagination from '../../components/ui/ListPagination.jsx'
import { useListFilters } from '../../hooks/useListFilters.js'
import { ficheService } from '../../services/ficheService.js'
import { ETAPES } from '../../utils/constants.js'
import { formatDate, personName } from '../../utils/format.js'
import { downloadExcel, matchesSearch, paginate } from '../../utils/listTools.js'
import { toast } from '../../utils/toast.js'
import './Fiches.css'

// Une seule page « Fiches » pour tous les profils. Les données viennent de la même API qu'avant :
// /fiches (registre filtré par le serveur selon le profil) ou /admin/fiches pour l'administrateur
// fonctionnel, qui seul voit l'action « Gérer » (pilote et confidentialité).

const ETAPE_OPTIONS = Object.entries(ETAPES).map(([code, etape]) => [code, etape.label])
const CONFIDENTIALITE_OPTIONS = [['NORMAL', 'Normal'], ['RESTREINT', 'Restreint']]
const REGISTRE_FILTERS = { q: '', statut_etape: '', unite_id: '', equipe: '', equipement_id: '', type_amelioration: '', origine_id: '', confidentialite: '', date_debut: '', date_fin: '' }
const ADMIN_FILTERS = { q: '', statut_etape: '', confidentialite: '' }

const initials = (name) => (name ? name.split(' ').map((part) => part[0]).join('').slice(0, 2) : '?')
const withoutEmpty = (values) => Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ''))

// Les deux registres ramènent leurs fiches à une même ligne, affichée et exportée de la même façon.
const ligneRegistre = (fiche) => ({ ...fiche, piloteNom: fiche.pilote ?? null, equipe: fiche.membres ?? [] })
const ligneAdmin = (fiche) => ({ ...fiche, unite: fiche.unite?.libelle ?? '—', piloteNom: personName(fiche.pilote), equipe: (fiche.membres ?? []).map(personName), source: fiche })

function exportColumns(complet) {
  return [
    { label: 'N° A3', value: (fiche) => fiche.numero_a3 },
    { label: 'Titre', value: (fiche) => fiche.titre },
    { label: 'Unité', value: (fiche) => fiche.unite },
    ...(complet ? [{ label: 'Équipement', value: (fiche) => fiche.equipement ?? '—' }] : []),
    { label: 'Pilote', value: (fiche) => fiche.piloteNom ?? 'Non désigné' },
    { label: 'Équipe', value: (fiche) => fiche.equipe.join(', ') },
    { label: 'Étape', value: (fiche) => fiche.statut_etape_libelle ?? ETAPES[fiche.statut_etape]?.label ?? fiche.statut_etape },
    ...(complet ? [{ label: 'Date cible', value: (fiche) => fiche.date_cible ? formatDate(fiche.date_cible) : '—' }] : []),
    { label: 'Confidentialité', value: (fiche) => fiche.confidentialite },
    ...(complet ? [{ label: 'Ancienneté (jours)', value: (fiche) => fiche.anciennete_jours }] : []),
  ]
}

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
    return rows.map(ligneRegistre)
  }

  return {
    rows: result?.data.map(ligneRegistre) ?? [],
    total: result?.meta.total ?? 0,
    loading: !result && !error,
    error,
    exportRows,
    exportColumns: exportColumns(true),
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
    Promise.all([ficheService.registreAdmin(), apiRequest('/admin/users')])
      .then(([fichesResult, usersResult]) => {
        if (!cancelled) { setFiches(fichesResult); setUsers(usersResult.data) }
      })
      .catch((loadError) => { if (!cancelled) setError(loadError.message) })
    return () => { cancelled = true }
  }, [enabled])

  const filtered = useMemo(() => (fiches ?? []).filter((fiche) => (
    matchesSearch([fiche.numero_a3, fiche.titre, fiche.unite?.libelle, personName(fiche.pilote), ...(fiche.membres ?? []).map(personName), fiche.statut_etape, fiche.statut_general, fiche.confidentialite], filters.q)
    && (!filters.statut_etape || fiche.statut_etape === filters.statut_etape)
    && (!filters.confidentialite || fiche.confidentialite === filters.confidentialite)
  )), [fiches, filters])
  const visible = paginate(filtered, page, perPage)

  return {
    rows: visible.rows.map(ligneAdmin),
    total: filtered.length,
    currentPage: visible.page,
    loading: fiches === null && !error,
    error,
    users,
    exportRows: async () => filtered.map(ligneAdmin),
    exportColumns: exportColumns(false),
    replace: (updated) => setFiches((current) => current.map((fiche) => (fiche.id === updated.id ? updated : fiche))),
  }
}

/** « + équipe » : le survol affiche le nom des membres ; le lecteur d’écran les annonce. */
function EquipeBadge({ membres }) {
  const noms = membres.join(', ')
  return (
    <span aria-label={`Équipe : ${noms}`} className="fiches-page__equipe" tabIndex={0} title={noms}>
      + équipe ({membres.length})
    </span>
  )
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
    ...(isAdmin ? {} : { unite_id: searchParams.get('unite_id') ?? '', equipement_id: searchParams.get('equipement_id') ?? '', equipe: searchParams.get('equipe') ?? '' }),
  }))
  const { filters, page, pageSize: perPage, setFilter, setPage } = list
  const [sort, setSort] = useState({ tri: 'created_at', ordre: 'desc' })
  const [refs, setRefs] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [managed, setManaged] = useState(null)
  // Recherche, étape et unité suffisent au quotidien ; le reste s'ouvre à la demande
  // (ou d'office quand on arrive avec un filtre, par exemple l'historique d'un équipement).
  const [plusDeFiltres, setPlusDeFiltres] = useState(() => !isAdmin && ['equipement_id', 'type_amelioration', 'origine_id', 'confidentialite', 'date_debut', 'date_fin'].some((key) => filters[key]))

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
          <strong title={fiche.titre}>
            {fiche.confidentialite === 'RESTREINT' && <span className="fiches-page__lock" title="Fiche restreinte"><Icon name="lock" size={13} /><span className="sar-sr-only">Restreinte : </span></span>}
            {fiche.titre}
          </strong>
          <small>{fiche.equipement ? `${fiche.unite} · ${fiche.equipement}` : fiche.unite}</small>
        </span>
      ),
    },
    {
      key: 'pilote',
      label: 'Pilote et équipe',
      width: '240px',
      render: (fiche) => (
        <span className="fiches-page__pilote">
          <span aria-hidden="true" className="sar-avatar sar-avatar--sm">{initials(fiche.piloteNom)}</span>
          <span className="data-table__cell-text" title={fiche.piloteNom ?? 'Non désigné'}>{fiche.piloteNom ?? <span className="sar-muted">Non désigné</span>}</span>
          {fiche.equipe.length > 0 && <EquipeBadge membres={fiche.equipe} />}
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
            <FilterSelect label="Équipe" options={[['1', 'Mes équipes']]} value={filters.equipe} onChange={setFilter('equipe')} />
            {plusDeFiltres ? (
              <>
                <FilterSelect label="Équipement" options={equipementOptions} value={filters.equipement_id} onChange={setFilter('equipement_id')} />
                <FilterSelect allLabel="Tous" label="Type" options={(refs?.listes?.type_amelioration ?? []).map((valeur) => [valeur.code, valeur.libelle])} value={filters.type_amelioration} onChange={setFilter('type_amelioration')} />
                <FilterSelect label="Origine" options={(refs?.listes?.origine ?? []).map((valeur) => [valeur.id, valeur.libelle])} value={filters.origine_id} onChange={setFilter('origine_id')} />
                <FilterSelect label="Confidentialité" options={CONFIDENTIALITE_OPTIONS} value={filters.confidentialite} onChange={setFilter('confidentialite')} />
                <DateRangeFilter
                  from={filters.date_debut}
                  label="Création"
                  to={filters.date_fin}
                  onChange={({ from, to }) => list.updateFilters({ date_debut: from, date_fin: to })}
                />
              </>
            ) : (
              <Button type="button" variant="ghost" onClick={() => setPlusDeFiltres(true)}>Plus de filtres</Button>
            )}
          </>
        )}
        {isAdmin && <FilterSelect label="Confidentialité" options={CONFIDENTIALITE_OPTIONS} value={filters.confidentialite} onChange={setFilter('confidentialite')} />}
        <ToolbarActions>
          <ResultCount count={source.total} singular="fiche" />
          {list.active && <Button type="button" variant="ghost" onClick={list.reset}>Réinitialiser</Button>}
          <Button disabled={!source.total} icon="download" loading={exporting} loadingLabel="Préparation…" type="button" variant="secondary" onClick={exportList}>Exporter Excel</Button>
        </ToolbarActions>
      </ListToolbar>

      {(source.error || exportError) && <Alert severity="error">{source.error || exportError}</Alert>}

      {!source.error && (
        <DataTable
          actions={(fiche) => (
            <RowActions
              actions={[
                { icon: 'eye', label: 'Voir', onClick: () => navigate(`/fiches/${fiche.id}`) },
                ...(isAdmin ? [{ icon: 'settings', label: 'Gérer', onClick: () => setManaged(fiche.source) }] : []),
              ]}
            />
          )}
          actionsWidth={isAdmin ? '184px' : '104px'}
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
