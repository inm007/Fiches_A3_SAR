import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../auth/api.js'
import Button from '../common/Button.jsx'
import ConfirmDialog from '../common/ConfirmDialog.jsx'
import DataTable from '../common/DataTable.jsx'
import FilterBar from '../common/FilterBar.jsx'
import Icon from '../common/Icon.jsx'
import Modal from '../common/Modal.jsx'
import PageBanner from '../common/PageBanner.jsx'
import RowActions from '../common/RowActions.jsx'
import ListPagination from '../common/ListPagination.jsx'
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
  compactTable = false,
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
  const [success, setSuccess] = useState('')
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
    setSuccess('')
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
    setSuccess('')
  }

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setFormError('')
    setSuccess('')
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
      toast(editing ? 'Modifications enregistrées.' : 'Élément créé.', 3000)
      await load()
    } catch (saveError) {
      const validationErrors = saveError.data?.errors
      setFormError(validationErrors
        ? Object.values(validationErrors).flat().join(' ')
        : saveError.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(row) {
    setError('')
    setSuccess('')
    try {
      await apiRequest(`${endpoint}/${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ actif: !row.actif }),
      })
      setSuccess(row.actif ? 'Élément désactivé.' : 'Élément activé.')
      await load()
    } catch (toggleError) {
      setError(toggleError.message)
    }
  }

  async function runExtraAction(action, row) {
    setError('')
    setSuccess('')
    try {
      const message = await action.run(row)
      setSuccess(message || 'Opération effectuée.')
    } catch (actionError) {
      setError(actionError.message)
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
        variant={compactTable ? 'secondary' : 'export'}
      >
        {compactTable && <Icon name="download" size={16} />}
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

  return (
    <section className={`admin-entity${compactTable ? ' admin-entity--compact' : ''}`}>
      <PageBanner actions={<Button onClick={openCreate}>Ajouter</Button>} description={description} title={title} />

      {error && <p className="admin-entity__message admin-entity__message--error" role="alert">{error}</p>}
      {success && <p className="admin-entity__message admin-entity__message--success" role="status">{success}</p>}

      {compactTable ? (
        <FilterBar className="admin-entity__filterbar">
          <div className="admin-entity__filterbar-primary">
            <label className="admin-entity__search" htmlFor={`${endpoint}-search`}>
              <span>Rechercher</span>
              <input
                id={`${endpoint}-search`}
                onChange={(event) => { setQuery(event.target.value); setPage(1) }}
                placeholder="Rechercher dans tous les champs…"
                type="search"
                value={query}
              />
            </label>
            <div className="admin-entity__filterbar-tools">
              <span className="admin-entity__result-count">{filteredRows.length} résultat{filteredRows.length > 1 ? 's' : ''}</span>
              {(query || Object.values(filters).some(Boolean)) && (
                <Button onClick={() => { setQuery(''); setFilters({}); setPage(1) }} type="button" variant="secondary">
                  Réinitialiser
                </Button>
              )}
              {renderExportButton()}
            </div>
          </div>
          {filterOptions.length > 0 && (
            <div className="admin-entity__filters">
              {filterOptions.map(({ column, options }) => (
                <label className="admin-entity__filter" key={column.key}>
                  <span>{column.label}</span>
                  <select
                    aria-label={`Filtrer par ${column.label}`}
                    onChange={(event) => { setFilters((current) => ({ ...current, [column.key]: event.target.value })); setPage(1) }}
                    value={filters[column.key] ?? ''}
                  >
                    <option value="">Tous</option>
                    {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              ))}
            </div>
          )}
        </FilterBar>
      ) : (
        <div className="admin-entity__toolbar sar-list-toolbar">
          <label className="sar-list-toolbar__search" htmlFor={`${endpoint}-search`}>
            Rechercher
            <input
              id={`${endpoint}-search`}
              onChange={(event) => { setQuery(event.target.value); setPage(1) }}
              placeholder="Rechercher dans tous les champs…"
              type="search"
              value={query}
            />
          </label>
          {filterOptions.map(({ column, options }) => (
            <label className="admin-entity__filter" key={column.key}>
              <span>{column.label}</span>
              <select
                aria-label={`Filtrer par ${column.label}`}
                onChange={(event) => { setFilters((current) => ({ ...current, [column.key]: event.target.value })); setPage(1) }}
                value={filters[column.key] ?? ''}
              >
                <option value="">Toutes</option>
                {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          ))}
          {(query || Object.values(filters).some(Boolean)) && (
            <Button type="button" variant="secondary" onClick={() => { setQuery(''); setFilters({}); setPage(1) }}>Réinitialiser</Button>
          )}
          <span className="sar-list-toolbar__count">{filteredRows.length} résultat{filteredRows.length > 1 ? 's' : ''}</span>
          {renderExportButton()}
        </div>
      )}

      {compactTable ? (
        <DataTable
          actions={renderRowActions}
          columns={columns}
          context={relatedData}
          emptyMessage="Aucun élément trouvé."
          loading={loading}
          rows={visibleRows}
          variant="compact"
        />
      ) : (
        <div className="admin-entity__table-wrap">
          <table className="admin-entity__table">
            <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}<th>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length + 1}>Chargement…</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td colSpan={columns.length + 1}>Aucun élément trouvé.</td></tr>
              ) : visibleRows.map((row) => (
                <tr key={row.id}>
                  {columns.map((column) => (
                    <td key={column.key}>{column.render ? column.render(row, relatedData) : (column.value ? column.value(row, relatedData) : row[column.key]) ?? '—'}</td>
                  ))}
                  <td className="admin-entity__actions sar-list-actions">
                    <Button onClick={() => openEdit(row)} size="small" variant="edit">Modifier</Button>
                    {typeof row.actif === 'boolean' && (
                      <Button onClick={() => toggleActive(row)} size="small" variant={row.actif ? 'danger' : 'success'}>
                        {row.actif ? 'Désactiver' : 'Activer'}
                      </Button>
                    )}
                    {extraActions?.map((action) => (
                      <Button key={action.label} disabled={action.disabled?.(row)} onClick={() => runExtraAction(action, row)} size="small" variant="secondary">
                        {action.label}
                      </Button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
            <Button disabled={saving} form="admin-entity-form" type="submit">
              {saving && <span aria-hidden="true" className="admin-entity__spinner" />}
              {saving ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </>
        )}
        onClose={() => { setModalOpen(false); setFormError('') }}
        open={modalOpen}
        size={fields.length > 4 ? 'md' : 'sm'}
        title={editing ? `Modifier — ${title}` : `Ajouter — ${title}`}
      >
        <form className={`admin-entity__form${fields.length > 5 ? ' admin-entity__form--columns' : ''}`} id="admin-entity-form" onSubmit={save}>
          {formError && (
            <div className="admin-entity__form-error" role="alert">
              <Icon name="al" size={16} />
              <span>{formError}</span>
            </div>
          )}
          {fields.map((field) => {
            if (field.showWhen && !field.showWhen(values, editing)) return null
            const fieldId = `${endpoint}-${field.name}`
            if (field.type === 'checkbox') {
              return (
                <label className="admin-entity__checkbox" htmlFor={fieldId} key={field.name}>
                  <input checked={Boolean(values[field.name])} id={fieldId} onChange={(event) => setValues({ ...values, [field.name]: event.target.checked })} type="checkbox" />
                  {field.label}
                </label>
              )
            }
            const options = field.options ?? relatedData[field.optionsKey] ?? []
            return (
              <label className="admin-entity__field" htmlFor={fieldId} key={field.name}>
                <span>{field.label}</span>
                {field.type === 'select' ? (
                  <select
                    id={fieldId}
                    onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
                    required={field.required}
                    data-modal-autofocus={fields.indexOf(field) === 0 ? true : undefined}
                    value={values[field.name]}
                  >
                    <option value="">Sélectionner…</option>
                    {options.map((option) => (
                      <option key={option.id ?? option.value} value={option.id ?? option.value}>
                        {field.optionLabel ? field.optionLabel(option) : option.label ?? option.libelle ?? option.nom ?? option.code}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={fieldId}
                    max={field.max}
                    maxLength={field.maxLength}
                    min={field.min}
                    onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
                    required={field.required}
                    type={field.type ?? 'text'}
                    data-modal-autofocus={fields.indexOf(field) === 0 ? true : undefined}
                    value={values[field.name]}
                  />
                )}
                {field.hint && <small>{field.hint}</small>}
              </label>
            )
          })}
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
