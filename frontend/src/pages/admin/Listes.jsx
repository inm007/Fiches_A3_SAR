import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../../auth/api.js'
import Button from '../../components/common/Button.jsx'
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx'
import DataTable from '../../components/common/DataTable.jsx'
import FilterBar from '../../components/common/FilterBar.jsx'
import Icon from '../../components/common/Icon.jsx'
import RowActions from '../../components/common/RowActions.jsx'
import Badge from '../../components/common/Badge.jsx'
import ListPagination from '../../components/common/ListPagination.jsx'
import Modal from '../../components/common/Modal.jsx'
import { downloadExcel, matchesSearch } from '../../utils/listTools.js'
import { toast } from '../../utils/toast.js'
import './Listes.css'

const PAGE_SIZE = 25

function Listes() {
  const [lists, setLists] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [values, setValues] = useState([])
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ code: '', libelle: '', ordre: 0 })
  const [initialForm, setInitialForm] = useState({ code: '', libelle: '', ordre: 0 })
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [pendingDeactivation, setPendingDeactivation] = useState(null)
  const [deactivating, setDeactivating] = useState(false)
  const formDirty = form.code !== initialForm.code
    || form.libelle !== initialForm.libelle
    || form.ordre !== initialForm.ordre

  const loadValues = useCallback(async (listId) => {
    if (!listId) {
      setValues([])
      return
    }
    const result = await apiRequest(`/admin/lists/${listId}/values`)
    setValues([...result.data].sort((a, b) => a.ordre - b.ordre))
  }, [])

  useEffect(() => {
    let cancelled = false
    apiRequest('/admin/lists')
      .then((result) => {
        if (!cancelled) {
          setLists(result.data)
          setSelectedId((current) => current || String(result.data[0]?.id ?? ''))
          if (!result.data.length) setLoading(false)
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError.message)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!selectedId) return
    let cancelled = false
    apiRequest(`/admin/lists/${selectedId}/values`)
      .then((result) => {
        if (!cancelled) setValues([...result.data].sort((a, b) => a.ordre - b.ordre))
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [selectedId])

  function selectList(listId) {
    setLoading(true)
    setSelectedId(listId)
    setPage(1)
    setQuery('')
    setActiveFilter('')
  }

  function startCreate() {
    const nextOrder = values.reduce((max, item) => Math.max(max, Number(item.ordre) || 0), 0) + 1
    const nextForm = { code: '', libelle: '', ordre: nextOrder }
    setEditing(null)
    setModalOpen(true)
    setForm(nextForm)
    setInitialForm(nextForm)
    setError('')
    setFormError('')
    setNotice('')
  }

  function startEdit(item) {
    const nextForm = { code: item.code, libelle: item.libelle, ordre: item.ordre }
    setEditing(item)
    setModalOpen(true)
    setForm(nextForm)
    setInitialForm(nextForm)
    setError('')
    setFormError('')
    setNotice('')
  }

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setFormError('')
    setNotice('')
    try {
      await apiRequest(`/admin/lists/${selectedId}/values${editing ? `/${editing.id}` : ''}`, {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(form),
      })
      setModalOpen(false)
      setEditing(null)
      toast(editing ? 'Valeur mise à jour.' : 'Valeur ajoutée.', 3000)
      await loadValues(selectedId)
    } catch (saveError) {
      const validationErrors = saveError.data?.errors
      setFormError(validationErrors ? Object.values(validationErrors).flat().join(' ') : saveError.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(item) {
    setError('')
    setNotice('')
    try {
      await apiRequest(`/admin/lists/${selectedId}/values/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ actif: !item.actif }),
      })
      setNotice(item.actif ? 'Valeur désactivée.' : 'Valeur activée.')
      await loadValues(selectedId)
    } catch (toggleError) {
      setError(toggleError.message)
    }
  }

  async function confirmDeactivation() {
    if (!pendingDeactivation) return
    setDeactivating(true)
    try {
      await toggleActive(pendingDeactivation)
      setPendingDeactivation(null)
    } finally {
      setDeactivating(false)
    }
  }

  async function move(item, direction) {
    const index = values.findIndex((value) => value.id === item.id)
    const reordered = [...values]
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= reordered.length) return
    const current = reordered[index]
    reordered[index] = reordered[newIndex]
    reordered[newIndex] = current
    setError('')
    setNotice('')
    try {
      const result = await apiRequest(`/admin/lists/${selectedId}/values/order`, {
        method: 'PUT',
        body: JSON.stringify({ ids: reordered.map((value) => value.id) }),
      })
      setValues(result.data)
    } catch (moveError) {
      setError(`Le réordonnancement n’a pas abouti : ${moveError.message}`)
      await loadValues(selectedId)
    }
  }

  const filteredValues = values.filter((item) => (
    matchesSearch([item.code, item.libelle, item.ordre, item.actif ? 'Actif Oui' : 'Inactif Non'], query)
    && (activeFilter === '' || String(item.actif) === activeFilter)
  ))
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filteredValues.length / pageSize)))
  const visibleValues = filteredValues.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <section className="listes-page">
      <header className="listes-page__header">
        <div>
          <h1>Listes de choix</h1>
          <p>Gérez les valeurs de référence utilisées dans les fiches. Les valeurs historiques sont conservées.</p>
        </div>
      </header>
      {error && <p className="listes-page__message listes-page__message--error" role="alert">{error}</p>}
      {notice && <p className="listes-page__message listes-page__message--success" role="status">{notice}</p>}
      <div className="listes-page__layout">
        <nav aria-label="Listes de référence" className="listes-page__nav">
          <h2>Référentiels</h2>
          {lists.map((list) => (
            <button
              aria-current={String(list.id) === selectedId ? 'page' : undefined}
              className={String(list.id) === selectedId ? 'is-active' : ''}
              key={list.id}
              onClick={() => selectList(String(list.id))}
              type="button"
            >
              {list.libelle}
            </button>
          ))}
        </nav>
        <section className="listes-page__content">
          <header>
            <div>
              <h2>{lists.find((list) => String(list.id) === selectedId)?.libelle ?? 'Valeurs'}</h2>
              <p>{lists.find((list) => String(list.id) === selectedId)?.description}</p>
            </div>
            <Button disabled={!selectedId} onClick={startCreate}>Ajouter une valeur</Button>
          </header>
          <FilterBar className="listes-page__filterbar">
            <div className="listes-page__filterbar-primary">
              <label className="listes-page__search" htmlFor="listes-search">
                <span>Rechercher</span>
                <input id="listes-search" onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Code ou libellé…" type="search" value={query} />
              </label>
              <label className="listes-page__filter">
                <span>État</span>
                <select onChange={(event) => { setActiveFilter(event.target.value); setPage(1) }} value={activeFilter}>
                  <option value="">Tous</option>
                  <option value="true">Actifs</option>
                  <option value="false">Inactifs</option>
                </select>
              </label>
              <div className="listes-page__filterbar-tools">
                <span className="listes-page__result-count">{filteredValues.length} résultat{filteredValues.length > 1 ? 's' : ''}</span>
                {(query || activeFilter) && <Button onClick={() => { setQuery(''); setActiveFilter(''); setPage(1) }} type="button" variant="secondary">Réinitialiser</Button>}
                <Button disabled={loading || filteredValues.length === 0} onClick={() => downloadExcel(
                  `valeurs-${lists.find((list) => String(list.id) === selectedId)?.code ?? 'referentiel'}.xlsx`,
                  [
                    { label: 'Code', value: (item) => item.code },
                    { label: 'Libellé', value: (item) => item.libelle },
                    { label: 'Ordre', value: (item) => item.ordre },
                    { label: 'Actif', value: (item) => item.actif ? 'Oui' : 'Non' },
                  ],
                  filteredValues,
                )} type="button" variant="secondary"><Icon name="download" size={16} />Exporter Excel</Button>
              </div>
            </div>
          </FilterBar>
          <DataTable
            actions={(item) => {
              const index = values.findIndex((value) => value.id === item.id)
              const movementDisabled = Boolean(query || activeFilter) || page !== 1
              return (
                <RowActions
                  actions={[
                    { icon: 'arrow-up', label: 'Monter', disabled: movementDisabled || index === 0, onClick: () => move(item, -1) },
                    { icon: 'arrow-down', label: 'Descendre', disabled: movementDisabled || index === values.length - 1, onClick: () => move(item, 1) },
                    { icon: 'edit', label: 'Modifier', onClick: () => startEdit(item) },
                    {
                      icon: item.actif ? 'disable' : 'enable',
                      label: item.actif ? 'Désactiver' : 'Réactiver',
                      tone: item.actif ? 'danger' : 'success',
                      onClick: () => item.actif ? setPendingDeactivation(item) : toggleActive(item),
                    },
                  ]}
                  maxVisible={4}
                />
              )
            }}
            columns={[
              { key: 'code', label: 'Code', width: '22%', filterable: false, titleValue: (item) => item.code },
              {
                key: 'libelle',
                label: 'Libellé',
                width: '36%',
                filterable: false,
                titleValue: (item) => item.libelle,
                render: (item) => <span className="data-table__cell-text" title={item.libelle}>{item.libelle}</span>,
              },
              { key: 'ordre', label: 'Ordre', width: '12%', filterable: false },
              {
                key: 'actif',
                label: 'État',
                width: '14%',
                value: (item) => item.actif ? 'Actif' : 'Inactif',
                render: (item) => <Badge tone={item.actif ? 'success' : 'muted'}>{item.actif ? 'Actif' : 'Inactif'}</Badge>,
              },
            ]}
            emptyMessage="Aucune valeur dans cette liste."
            loading={loading}
            rows={visibleValues}
            variant="compact"
          />
          {!loading && filteredValues.length > 0 && (
            <ListPagination
              page={currentPage}
              pageSize={pageSize}
              total={filteredValues.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
            />
          )}
        </section>
      </div>
      <Modal
        dirty={formDirty}
        footer={({ requestClose }) => (
          <>
            <Button disabled={saving} onClick={requestClose} type="button" variant="secondary">Annuler</Button>
            <Button disabled={saving} form="listes-value-form" type="submit">
              {saving && <span aria-hidden="true" className="listes-page__spinner" />}
              {saving ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </>
        )}
        onClose={() => { setModalOpen(false); setFormError('') }}
        open={modalOpen}
        size="sm"
        title={editing ? 'Modifier une valeur' : 'Ajouter une valeur'}
      >
        <form className="listes-page__form" id="listes-value-form" onSubmit={save}>
          {formError && (
            <div className="listes-page__form-error" role="alert">
              <Icon name="al" size={16} />
              <span>{formError}</span>
            </div>
          )}
          <label>Code<input data-modal-autofocus maxLength="255" onChange={(event) => setForm({ ...form, code: event.target.value })} required value={form.code} /></label>
          <label>Libellé<input maxLength="255" onChange={(event) => setForm({ ...form, libelle: event.target.value })} required value={form.libelle} /></label>
          <label>Ordre<input min="0" onChange={(event) => setForm({ ...form, ordre: Number(event.target.value) })} required type="number" value={form.ordre} /></label>
        </form>
      </Modal>
      <ConfirmDialog
        confirmLabel="Désactiver"
        busy={deactivating}
        onCancel={() => setPendingDeactivation(null)}
        onConfirm={confirmDeactivation}
        open={pendingDeactivation !== null}
        title="Désactiver cette valeur ?"
      >
        La valeur restera disponible dans l’historique des fiches, mais ne pourra plus être sélectionnée.
      </ConfirmDialog>
    </section>
  )
}

export default Listes
