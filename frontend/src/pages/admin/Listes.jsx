import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../../auth/api.js'
import Button from '../../components/ui/Button.jsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Alert from '../../components/ui/Alert.jsx'
import { TextInput } from '../../components/ui/FormControls.jsx'
import { FilterSelect, ListToolbar, ResultCount, SearchField, ToolbarActions } from '../../components/shared/ListToolbar.jsx'
import RowActions from '../../components/ui/RowActions.jsx'
import Badge from '../../components/ui/Badge.jsx'
import ListPagination from '../../components/ui/ListPagination.jsx'
import Modal from '../../components/ui/Modal.jsx'
import PageBanner from '../../components/shared/PageBanner.jsx'
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
  const [fieldErrors, setFieldErrors] = useState({})
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
    setFieldErrors({})
  }

  function startEdit(item) {
    const nextForm = { code: item.code, libelle: item.libelle, ordre: item.ordre }
    setEditing(item)
    setModalOpen(true)
    setForm(nextForm)
    setInitialForm(nextForm)
    setError('')
    setFormError('')
    setFieldErrors({})
  }

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setFormError('')
    setFieldErrors({})
    try {
      await apiRequest(`/admin/lists/${selectedId}/values${editing ? `/${editing.id}` : ''}`, {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(form),
      })
      setModalOpen(false)
      setEditing(null)
      toast.success(editing ? 'Valeur mise à jour.' : 'Valeur ajoutée.')
      await loadValues(selectedId)
    } catch (saveError) {
      const validationErrors = saveError.data?.errors ?? {}
      const orphans = Object.entries(validationErrors).filter(([name]) => !(name in form)).flatMap(([, messages]) => messages)
      setFieldErrors(validationErrors)
      setFormError(Object.keys(validationErrors).length ? orphans.join(' ') : saveError.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(item) {
    setError('')
    try {
      await apiRequest(`/admin/lists/${selectedId}/values/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ actif: !item.actif }),
      })
      toast.success(item.actif ? 'Valeur désactivée.' : 'Valeur activée.')
      await loadValues(selectedId)
    } catch (toggleError) {
      toast.error(toggleError.message)
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
    try {
      const result = await apiRequest(`/admin/lists/${selectedId}/values/order`, {
        method: 'PUT',
        body: JSON.stringify({ ids: reordered.map((value) => value.id) }),
      })
      setValues(result.data)
    } catch (moveError) {
      toast.error(`Le réordonnancement n’a pas abouti : ${moveError.message}`)
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
      <PageBanner
        actions={<Button disabled={!selectedId} icon="plus" onClick={startCreate}>Ajouter une valeur</Button>}
        description="Gérez les valeurs de référence utilisées dans les fiches. Les valeurs historiques sont conservées."
        title="Listes de choix"
      />
      {error && <Alert severity="error">{error}</Alert>}
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
          </header>
          <ListToolbar>
            <SearchField id="listes-search" placeholder="Code ou libellé…" value={query} onChange={(value) => { setQuery(value); setPage(1) }} />
            <FilterSelect allLabel="Tous" label="État" options={[['true', 'Actifs'], ['false', 'Inactifs']]} value={activeFilter} onChange={(value) => { setActiveFilter(value); setPage(1) }} />
            <ToolbarActions>
              <ResultCount count={filteredValues.length} />
              {(query || activeFilter) && <Button onClick={() => { setQuery(''); setActiveFilter(''); setPage(1) }} type="button" variant="secondary">Réinitialiser</Button>}
              <Button disabled={loading || filteredValues.length === 0} icon="download" onClick={() => downloadExcel(
                `valeurs-${lists.find((list) => String(list.id) === selectedId)?.code ?? 'referentiel'}.xlsx`,
                [
                  { label: 'Code', value: (item) => item.code },
                  { label: 'Libellé', value: (item) => item.libelle },
                  { label: 'Ordre', value: (item) => item.ordre },
                  { label: 'Actif', value: (item) => item.actif ? 'Oui' : 'Non' },
                ],
                filteredValues,
              )} type="button" variant="secondary">Exporter Excel</Button>
            </ToolbarActions>
          </ListToolbar>
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
                render: (item) => <Badge tone={item.actif ? 'active' : 'inactive'}>{item.actif ? 'Actif' : 'Inactif'}</Badge>,
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
            <Button form="listes-value-form" loading={saving} loadingLabel="Enregistrement…" type="submit">
              {editing ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </>
        )}
        onClose={() => { setModalOpen(false); setFormError(''); setFieldErrors({}) }}
        open={modalOpen}
        size="sm"
        title={editing ? 'Modifier une valeur' : 'Ajouter une valeur'}
      >
        <form className="listes-page__form" id="listes-value-form" noValidate onSubmit={save}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextInput data-modal-autofocus error={fieldErrors.code} label="Code" maxLength={255} required value={form.code} onChange={(code) => setForm({ ...form, code })} />
          <TextInput error={fieldErrors.libelle} label="Libellé" maxLength={255} required value={form.libelle} onChange={(libelle) => setForm({ ...form, libelle })} />
          <TextInput error={fieldErrors.ordre} label="Ordre" min={0} required type="number" value={form.ordre} onChange={(ordre) => setForm({ ...form, ordre: Number(ordre) })} />
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
