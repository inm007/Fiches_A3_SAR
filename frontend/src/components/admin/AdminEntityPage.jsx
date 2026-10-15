import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../auth/api.js'
import Alert from '../ui/Alert.jsx'
import Button from '../ui/Button.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import DataTable from '../ui/DataTable.jsx'
import { Checkbox, Select, TextInput } from '../ui/FormControls.jsx'
import Modal from '../ui/Modal.jsx'
import { FilterSelect, ListToolbar, ResultCount, SearchField, ToolbarActions } from '../shared/ListToolbar.jsx'
import PageBanner from '../shared/PageBanner.jsx'
import RowActions from '../ui/RowActions.jsx'
import ListPagination from '../ui/ListPagination.jsx'
import { downloadExcel, matchesSearch, normalizeSearchText } from '../../utils/listTools.js'
import { toast } from '../../utils/toast.js'
import './AdminEntityPage.css'

const EMPTY_RELATED = []
const PAGE_SIZE = 25

function emptyValues(fields) {
  return Object.fromEntries(fields.map((field) => [field.name, field.defaultValue ?? '']))
}

function AdminEntityPage({
  title,
  description,
  endpoint,
  fields,
  columns,
  related = EMPTY_RELATED,
  extraActions,
  exportColumns,
}) {
  const [rows, setRows] = useState([])
  const [relatedData, setRelatedData] = useState({})
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({})
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [values, setValues] = useState(() => emptyValues(fields))
  const [initialValues, setInitialValues] = useState(() => emptyValues(fields))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [pendingDeactivation, setPendingDeactivation] = useState(null)

  const load = useCallback(async () => {
    try {
      const [result, ...relatedResults] = await Promise.all([
        apiRequest(endpoint),
        ...related.map((item) => apiRequest(item.endpoint)),
      ])
      setRows(result.data)
      setRelatedData(Object.fromEntries(related.map((item, index) => [item.key, relatedResults[index].data])))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [endpoint, related])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      apiRequest(endpoint),
      ...related.map((item) => apiRequest(item.endpoint)),
    ])
      .then(([result, ...relatedResults]) => {
        if (!cancelled) {
          setRows(result.data)
          setRelatedData(Object.fromEntries(related.map((item, index) => [item.key, relatedResults[index].data])))
        }
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [endpoint, related])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const values = columns.map((column) => column.searchValue
        ? column.searchValue(row, relatedData)
        : column.value
          ? column.value(row, relatedData)
          : row[column.key])
      return matchesSearch(values, query) && columns.every((column) => (
        !filters[column.key]
        || normalizeSearchText(column.value ? column.value(row, relatedData) : row[column.key]) === filters[column.key]
      ))
    })
  }, [columns, filters, query, relatedData, rows])

  const filterOptions = useMemo(() => columns
    .filter((column) => column.filterable !== false)
    .map((column) => {
      const options = new Map()
      rows.forEach((row) => {
        const value = column.value ? column.value(row, relatedData) : row[column.key]
        const normalized = normalizeSearchText(value)
        if (normalized) options.set(normalized, String(value))
      })
      return { column, options: [...options.entries()].sort((a, b) => a[1].localeCompare(b[1], 'fr')) }
    })
    .filter(({ options }) => options.length > 1 && options.length <= 12), [columns, relatedData, rows])
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filteredRows.length / pageSize)))
  const visibleRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const formDirty = fields.some((field) => field.type === 'checkbox'
    ? Boolean(values[field.name]) !== Boolean(initialValues[field.name])
    : String(values[field.name] ?? '') !== String(initialValues[field.name] ?? ''))

  function openCreate() {
    setEditing(null)
    const nextValues = emptyValues(fields)
    setModalOpen(true)
    setValues(nextValues)
    setInitialValues(nextValues)
    setError('')
    setFormError('')
    setFieldErrors({})
  }

  function openEdit(row) {
    const nextValues = Object.fromEntries(fields.map((field) => {
      const value = row[field.name]
      return [field.name, field.type === 'checkbox'
        ? Boolean(value)
        : field.type === 'date' && value
          ? String(value).slice(0, 10)
          : (value ?? '')]
    }))
    setEditing(row)
    setModalOpen(true)
    setValues(nextValues)
    setInitialValues(nextValues)
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
    const payload = Object.fromEntries(fields.map((field) => {
      const value = values[field.name]
      return [field.name, field.type === 'checkbox' ? Boolean(value) : (value === '' ? null : value)]
    }))
    try {
      await apiRequest(editing ? `${endpoint}/${editing.id}` : endpoint, {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      })
      setModalOpen(false)
      setEditing(null)
      toast.success(editing ? 'Modifications enregistrées.' : 'Élément créé.')
      await load()
    } catch (saveError) {
      // Erreurs Laravel : sous chaque champ affiché ; celles sans champ visible restent en tête du formulaire.
      const validationErrors = saveError.data?.errors ?? {}
      const visible = fields.filter((field) => !field.showWhen || field.showWhen(values, editing)).map((field) => field.name)
      const orphans = Object.entries(validationErrors).filter(([name]) => !visible.includes(name)).flatMap(([, messages]) => messages)
      setFieldErrors(validationErrors)
      setFormError(Object.keys(validationErrors).length ? orphans.join(' ') : saveError.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(row) {
    setError('')
    try {
      await apiRequest(`${endpoint}/${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ actif: !row.actif }),
      })
      toast.success(row.actif ? 'Élément désactivé.' : 'Élément activé.')
      await load()
    } catch (toggleError) {
      toast.error(toggleError.message)
    }
  }

  async function runExtraAction(action, row) {
    setError('')
    try {
      const message = await action.run(row)
      toast.success(message || 'Opération effectuée.')
    } catch (actionError) {
      toast.error(actionError.message)
    }
  }

  function renderExportButton() {
    const columnsToExport = exportColumns ?? columns
    return (
      <Button
        disabled={loading || filteredRows.length === 0}
        onClick={() => downloadExcel(
          `${title.toLocaleLowerCase('fr').replaceAll(/[^a-z0-9]+/g, '-')}.xlsx`,
          columnsToExport.map((column) => ({
            label: column.label,
            value: (row) => column.value ? column.value(row, relatedData) : row[column.key],
          })),
          filteredRows,
        )}
        type="button"
        icon="download"
        variant="secondary"
      >
        Exporter Excel
      </Button>
    )
  }

  function renderRowActions(row) {
    const actions = [{
      icon: 'edit',
      label: 'Modifier',
      onClick: () => openEdit(row),
    }]
    extraActions?.forEach((action) => {
      actions.push({
        disabled: action.disabled?.(row),
        icon: action.icon ?? 'mail',
        label: action.label,
        onClick: () => runExtraAction(action, row),
      })
    })
    if (typeof row.actif === 'boolean') {
      actions.push({
        icon: row.actif ? 'disable' : 'enable',
        label: row.actif ? 'Désactiver' : 'Réactiver',
        onClick: () => {
          if (row.actif) setPendingDeactivation(row)
          else toggleActive(row)
        },
        tone: row.actif ? 'danger' : 'success',
      })
    }
    return <RowActions actions={actions} />
  }

  const filtersActive = Boolean(query) || Object.values(filters).some(Boolean)

  function renderField(field) {
    if (field.showWhen && !field.showWhen(values, editing)) return null
    const common = {
      error: fieldErrors[field.name],
      label: field.label,
      required: field.required,
      value: values[field.name],
      onChange: (value) => setValues((current) => ({ ...current, [field.name]: value })),
      'data-modal-autofocus': fields.indexOf(field) === 0 ? true : undefined,
    }
    if (field.type === 'checkbox') {
      return <Checkbox checked={Boolean(values[field.name])} key={field.name} label={field.label} onChange={common.onChange} />
    }
    if (field.type === 'select') {
      const options = (field.options ?? relatedData[field.optionsKey] ?? []).map((option) => [
        String(option.id ?? option.value),
        field.optionLabel ? field.optionLabel(option) : option.label ?? option.libelle ?? option.nom ?? option.code,
      ])
      return <Select key={field.name} {...common} hint={field.hint} options={options} placeholder="Sélectionner…" />
    }
    return <TextInput key={field.name} {...common} hint={field.hint} max={field.max} maxLength={field.maxLength} min={field.min} type={field.type ?? 'text'} />
  }

  return (
    <section className="admin-entity">
      <PageBanner actions={<Button icon="plus" onClick={openCreate}>Ajouter</Button>} description={description} title={title} />

      {error && <Alert severity="error">{error}</Alert>}

      <ListToolbar>
        <SearchField
          id={`${endpoint}-search`}
          placeholder="Rechercher dans tous les champs…"
          value={query}
          onChange={(value) => { setQuery(value); setPage(1) }}
        />
        {filterOptions.map(({ column, options }) => (
          <FilterSelect
            allLabel="Tous"
            key={column.key}
            label={column.label}
            options={options}
            value={filters[column.key] ?? ''}
            onChange={(value) => { setFilters((current) => ({ ...current, [column.key]: value })); setPage(1) }}
          />
        ))}
        <ToolbarActions>
          <ResultCount count={filteredRows.length} />
          {filtersActive && (
            <Button type="button" variant="secondary" onClick={() => { setQuery(''); setFilters({}); setPage(1) }}>Réinitialiser</Button>
          )}
          {renderExportButton()}
        </ToolbarActions>
      </ListToolbar>

      <DataTable
        actions={renderRowActions}
        columns={columns}
        context={relatedData}
        emptyAction={filtersActive ? undefined : <Button icon="plus" onClick={openCreate}>Ajouter</Button>}
        emptyDescription={filtersActive ? 'Modifiez la recherche ou réinitialisez les filtres.' : undefined}
        emptyMessage={filtersActive ? 'Aucun élément ne correspond à la recherche.' : 'Aucun élément pour le moment.'}
        loading={loading}
        rows={visibleRows}
        variant="compact"
      />
      {!loading && filteredRows.length > 0 && (
        <ListPagination
          page={currentPage}
          pageSize={pageSize}
          total={filteredRows.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
        />
      )}

      <Modal
        dirty={formDirty}
        footer={({ requestClose }) => (
          <>
            <Button disabled={saving} onClick={requestClose} type="button" variant="secondary">Annuler</Button>
            <Button form="admin-entity-form" loading={saving} loadingLabel="Enregistrement…" type="submit">
              {editing ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </>
        )}
        onClose={() => { setModalOpen(false); setFormError(''); setFieldErrors({}) }}
        open={modalOpen}
        size={fields.length > 4 ? 'md' : 'sm'}
        title={editing ? `Modifier — ${title}` : `Ajouter — ${title}`}
      >
        <form className={`admin-entity__form${fields.length > 5 ? ' admin-entity__form--columns' : ''}`} id="admin-entity-form" noValidate onSubmit={save}>
          {formError && <Alert severity="error">{formError}</Alert>}
          {fields.map(renderField)}
        </form>
      </Modal>
      <ConfirmDialog
        confirmLabel="Désactiver"
        onCancel={() => setPendingDeactivation(null)}
        onConfirm={async () => {
          if (!pendingDeactivation) return
          await toggleActive(pendingDeactivation)
          setPendingDeactivation(null)
        }}
        open={Boolean(pendingDeactivation)}
        title="Désactiver cet élément ?"
      >
        L’accès de cet élément sera désactivé. Vous pourrez le réactiver ultérieurement.
      </ConfirmDialog>
    </section>
  )
}

export default AdminEntityPage
