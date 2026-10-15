import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../../auth/api.js'
import Button from '../../components/common/Button.jsx'
import Badge from '../../components/common/Badge.jsx'
import DataTable from '../../components/common/DataTable.jsx'
import FilterBar from '../../components/common/FilterBar.jsx'
import Icon from '../../components/common/Icon.jsx'
import ListPagination from '../../components/common/ListPagination.jsx'
import Modal from '../../components/common/Modal.jsx'
import PageBanner from '../../components/common/PageBanner.jsx'
import EtapeBadge, { ConfidentialiteBadge } from '../../components/fiche/EtapeBadge.jsx'
import { downloadExcel, matchesSearch } from '../../utils/listTools.js'
import { toast } from '../../utils/toast.js'
import './AdminFiches.css'

const PAGE_SIZE = 25

function assignmentIsCurrent(assignment) {
  const today = new Date().toISOString().slice(0, 10)
  return assignment.actif
    && (!assignment.date_debut || String(assignment.date_debut).slice(0, 10) <= today)
    && (!assignment.date_fin || String(assignment.date_fin).slice(0, 10) >= today)
}

function AdminFiches() {
  const navigate = useNavigate()
  const [fiches, setFiches] = useState([])
  const [users, setUsers] = useState([])
  const [query, setQuery] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [confidentialityFilter, setConfidentialityFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [selected, setSelected] = useState(null)
  const [piloteId, setPiloteId] = useState('')
  const [confidentialite, setConfidentialite] = useState('NORMAL')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([apiRequest('/admin/fiches'), apiRequest('/admin/users')])
      .then(([fichesResult, usersResult]) => {
        if (!cancelled) {
          setFiches(fichesResult.data)
          setUsers(usersResult.data)
        }
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const filteredFiches = useMemo(() => {
    return fiches.filter((fiche) => (
      matchesSearch([
        fiche.numero_a3,
        fiche.titre,
        fiche.unite?.libelle,
        fiche.pilote ? `${fiche.pilote.prenom} ${fiche.pilote.nom}` : '',
        fiche.statut_etape,
        fiche.statut_general,
        fiche.confidentialite,
      ], query)
      && (!stageFilter || fiche.statut_etape === stageFilter)
      && (!confidentialityFilter || fiche.confidentialite === confidentialityFilter)
    ))
  }, [confidentialityFilter, fiches, query, stageFilter])
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filteredFiches.length / pageSize)))
  const visibleFiches = filteredFiches.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const eligiblePilots = useMemo(() => {
    if (!selected) return []
    return users.filter((user) => user.actif && user.affectations.some((assignment) => (
      assignment.role?.code === 'PILOTE'
      && assignment.unite_id === selected.unite?.id
      && assignmentIsCurrent(assignment)
    )))
  }, [selected, users])
  const hasChanges = Boolean(selected && (
    confidentialite !== selected.confidentialite
    || (selected.statut_etape === 'OUVERT' && piloteId !== (selected.pilote ? String(selected.pilote.id) : ''))
  ))

  function openFiche(fiche) {
    setSelected(fiche)
    setPiloteId(fiche.pilote ? String(fiche.pilote.id) : '')
    setConfidentialite(fiche.confidentialite)
    setError('')
  }

  async function save(event) {
    event.preventDefault()
    if (!selected || !hasChanges) return
    setSaving(true)
    setError('')
    const changes = { confidentialite }
    if (selected.statut_etape === 'OUVERT') {
      changes.pilote_id = piloteId ? Number(piloteId) : null
    }
    try {
      const result = await apiRequest(`/admin/fiches/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      })
      setFiches((current) => current.map((fiche) => fiche.id === selected.id ? result.data : fiche))
      setSelected(null)
      toast('Modifications enregistrées', 3000)
    } catch (saveError) {
      const validationErrors = saveError.data?.errors
      setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : saveError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-fiches">
      <PageBanner
        className="admin-fiches__banner"
        description="Consultation des fiches, désignation du pilote et gestion de la confidentialité. Le contenu métier reste en lecture seule."
        title="Registre des fiches A3"
      />
      {error && <p className="admin-fiches__message admin-fiches__message--error" role="alert">{error}</p>}
      <FilterBar className="admin-fiches__filterbar">
        <div className="admin-fiches__filterbar-primary">
          <label className="admin-fiches__search" htmlFor="admin-fiches-search">
            <span>Rechercher</span>
            <input id="admin-fiches-search" onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="N°, titre, unité, pilote…" type="search" value={query} />
          </label>
          <div className="admin-fiches__filterbar-tools">
            <span className="admin-fiches__result-count">{filteredFiches.length} résultat{filteredFiches.length > 1 ? 's' : ''}</span>
            {(query || stageFilter || confidentialityFilter) && (
              <Button type="button" variant="secondary" onClick={() => { setQuery(''); setStageFilter(''); setConfidentialityFilter(''); setPage(1) }}>Réinitialiser</Button>
            )}
            <Button disabled={loading || filteredFiches.length === 0} type="button" variant="secondary" onClick={() => downloadExcel(
              'registre-fiches-a3.xlsx',
              [
                { label: 'N° A3', value: (fiche) => fiche.numero_a3 },
                { label: 'Titre', value: (fiche) => fiche.titre },
                { label: 'Unité', value: (fiche) => fiche.unite?.libelle },
                { label: 'Pilote', value: (fiche) => fiche.pilote ? `${fiche.pilote.prenom} ${fiche.pilote.nom}` : 'Non désigné' },
                { label: 'Étape', value: (fiche) => fiche.statut_etape },
                { label: 'Confidentialité', value: (fiche) => fiche.confidentialite },
              ],
              filteredFiches,
            )}><Icon name="download" size={16} />Exporter Excel</Button>
          </div>
        </div>
        <div className="admin-fiches__filters">
          <label className="admin-fiches__filter">
            <span>Étape</span>
            <select onChange={(event) => { setStageFilter(event.target.value); setPage(1) }} value={stageFilter}>
              <option value="">Toutes</option>
              {[...new Set(fiches.map((fiche) => fiche.statut_etape))].sort().map((stage) => <option key={stage} value={stage}>{stage.replaceAll('_', ' ')}</option>)}
            </select>
          </label>
          <label className="admin-fiches__filter">
            <span>Confidentialité</span>
            <select onChange={(event) => { setConfidentialityFilter(event.target.value); setPage(1) }} value={confidentialityFilter}>
              <option value="">Toutes</option>
              <option value="NORMAL">Normale</option>
              <option value="RESTREINT">Restreinte</option>
            </select>
          </label>
        </div>
      </FilterBar>
      <DataTable
        actions={(fiche) => (
          <div className="admin-fiches__row-actions">
            <Button className="admin-fiches__open-action" onClick={() => navigate(`/fiches/${fiche.id}`)} size="small" type="button" variant="secondary">Ouvrir</Button>
            <Button className="admin-fiches__open-action" onClick={() => openFiche(fiche)} size="small" type="button" variant="secondary">Gérer</Button>
          </div>
        )}
        columns={[
          {
            key: 'numero_a3',
            label: 'N° A3',
            width: '15%',
            titleValue: (fiche) => fiche.numero_a3,
            render: (fiche) => <span className="admin-fiches__number" title={fiche.numero_a3}>{fiche.numero_a3}</span>,
          },
          {
            key: 'titre',
            label: 'Titre',
            width: '25%',
            titleValue: (fiche) => fiche.titre,
            render: (fiche) => <span className="data-table__cell-text" title={fiche.titre}>{fiche.titre}</span>,
          },
          {
            key: 'unite',
            label: 'Unité',
            width: '19%',
            value: (fiche) => fiche.unite?.libelle ?? '—',
            render: (fiche) => <span className="data-table__cell-text data-table__unit-name" title={fiche.unite?.libelle ?? '—'}>{fiche.unite?.libelle ?? '—'}</span>,
          },
          {
            key: 'pilote',
            label: 'Pilote',
            width: '16%',
            value: (fiche) => fiche.pilote ? `${fiche.pilote.prenom} ${fiche.pilote.nom}` : 'Non désigné',
            render: (fiche) => <span className="data-table__cell-text" title={fiche.pilote ? `${fiche.pilote.prenom} ${fiche.pilote.nom}` : 'Non désigné'}>{fiche.pilote ? `${fiche.pilote.prenom} ${fiche.pilote.nom}` : 'Non désigné'}</span>,
          },
          {
            key: 'statut_etape',
            label: 'Étape',
            width: '14%',
            value: (fiche) => fiche.statut_etape.replaceAll('_', ' '),
            render: (fiche) => <EtapeBadge etape={fiche.statut_etape} />,
          },
          {
            key: 'confidentialite',
            label: 'Confidentialité',
            width: '16%',
            value: (fiche) => fiche.confidentialite === 'RESTREINT' ? 'Restreint' : 'Normal',
            render: (fiche) => <ConfidentialiteBadge value={fiche.confidentialite} />,
          },
        ]}
        emptyMessage="Aucune fiche trouvée."
        loading={loading}
        rows={visibleFiches}
        variant="compact"
      />
      {!loading && filteredFiches.length > 0 && (
        <ListPagination
          page={currentPage}
          pageSize={pageSize}
          total={filteredFiches.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
        />
      )}
      <Modal
        dirty={hasChanges}
        footer={({ requestClose }) => (
          <>
            <Button disabled={saving} onClick={requestClose} type="button" variant="secondary">Annuler</Button>
            <Button disabled={!hasChanges || saving} form="admin-fiches-management-form" type="submit">
              {saving && <span aria-hidden="true" className="admin-fiches__spinner" />}
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        )}
        onClose={() => { setSelected(null); setError('') }}
        open={selected !== null}
        size="sm"
        title={selected ? `Gérer la fiche ${selected.numero_a3}` : 'Gérer la fiche'}
      >
        {selected && (
          <form className="admin-fiches__form" id="admin-fiches-management-form" onSubmit={save}>
            {error && (
              <div className="admin-fiches__modal-error" role="alert">
                <Icon name="al" size={16} />
                <span>{error}</span>
              </div>
            )}
            <div className="admin-fiches__summary">
              <strong title={selected.titre}>{selected.titre}</strong>
              <div className="admin-fiches__summary-badges">
                <Badge>{selected.unite?.libelle ?? 'Unité inconnue'}</Badge>
                <EtapeBadge etape={selected.statut_etape} />
              </div>
            </div>
            <label className="admin-fiches__field">
              <span>Confidentialité</span>
              <select
                data-modal-autofocus
                onChange={(event) => setConfidentialite(event.target.value)}
                value={confidentialite}
              >
                <option value="NORMAL">Normal</option>
                <option value="RESTREINT">Restreint</option>
              </select>
            </label>
            {selected.statut_etape === 'OUVERT' ? (
              <label className="admin-fiches__field">
                <span>Pilote</span>
                <select onChange={(event) => setPiloteId(event.target.value)} value={piloteId}>
                  <option value="">Non désigné</option>
                  {eligiblePilots.map((user) => (
                    <option key={user.id} value={user.id}>{user.prenom} {user.nom} — {user.identifiant}</option>
                  ))}
                </select>
                {eligiblePilots.length === 0 && <small>Aucun pilote actif n’est affecté à cette unité.</small>}
              </label>
            ) : (
              <p className="admin-fiches__readonly">Le pilote ne peut être changé qu’à l’étape Ouvert.</p>
            )}
            <p className="admin-fiches__readonly">
              <Icon name="info" size={16} />
              <span>Les autres données de la fiche restent en lecture seule.</span>
            </p>
          </form>
        )}
      </Modal>
    </section>
  )
}

export default AdminFiches
