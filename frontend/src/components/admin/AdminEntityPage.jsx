import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../auth/api.js'
import { useListFilters } from '../../hooks/useListFilters.js'
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
import { downloadExcel, matchesSearch, normalizeSearchText, paginate } from '../../utils/listTools.js'
import { toast } from '../../utils/toast.js'
import './AdminEntityPage.css'

const EMPTY_RELATED = []
const NO_FILTERS = { q: '' }
const DEFAULT_MESSAGES = {
  add: 'Ajouter',
  createTitle: (title) => `Ajouter — ${title}`,
  editTitle: (title) => `Modifier — ${title}`,
  created: 'Élément créé.',
  updated: 'Modifications enregistrées.',
  activated: 'Élément activé.',
  deactivated: 'Élément désactivé.',
  confirmTitle: 'Désactiver cet élément ?',
  confirmText: 'L’accès de cet élément sera désactivé. Vous pourrez le réactiver ultérieurement.',
  empty: 'Aucun élément pour le moment.',
}

function emptyValues(fields, rows) {
  return Object.fromEntries(fields.map((field) => [
    field.name,
    typeof field.defaultValue === 'function' ? field.defaultValue(rows) : field.defaultValue ?? '',
  ]))
}

const byOrder = (rows) => [...rows].sort((a, b) => a.ordre - b.ordre)

/**
 * Page d'administration d'un référentiel : recherche, filtres, export, ajout,
 * modification et désactivation.
 *
 * @param {string|null} props.endpoint Ressource REST ; null tant qu'elle n'est pas connue.
 * @param {boolean} [props.pending] La page attend encore de connaître sa ressource : la liste reste en chargement.
 * @param {string} [props.reorderEndpoint] Active le classement par `ordre` et les boutons Monter / Descendre.
 * @param {(content: import('react').ReactNode) => import('react').ReactNode} [props.wrapContent]
 *   Mise en page autour de la liste (sous le bandeau), ex. une colonne de navigation.
 * @param {Partial<typeof DEFAULT_MESSAGES>} [props.messages] Libellés propres à la page.
 *
 * Une colonne peut fixer les choix de son filtre avec `filterOptions` ([valeur normalisée, libellé]) ;
 * sinon le filtre est proposé quand la colonne compte entre 2 et 12 valeurs distinctes.
 */
function AdminEntityPage({
  title,
  description,
  endpoint,
  fields,
  columns,
  related = EMPTY_RELATED,
  extraActions,
  exportColumns,
  exportName,
  reorderEndpoint,
  searchPlaceholder = 'Rechercher dans tous les champs…',
  wrapContent = (content) => content,
  messages: customMessages,
  pending = false,
}) {
  const messages = { ...DEFAULT_MESSAGES, ...customMessages }
  const [rows, setRows] = useState([])
  const [relatedData, setRelatedData] = useState({})
  const list = useListFilters(NO_FILTERS)
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [values, setValues] = useState(() => emptyValues(fields, []))
  const [initialValues, setInitialValues] = useState(() => emptyValues(fields, []))
  const [loading, setLoading] = useState(Boolean(endpoint))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [pendingDeactivation, setPendingDeactivation] = useState(null)
  const [deactivating, setDeactivating] = useState(false)

  const fetchAll = useCallback(async () => {
    const [result, ...relatedResults] = await Promise.all([
      apiRequest(endpoint),
      ...related.map((item) => apiRequest(item.endpoint)),
    ])
    return {
      rows: reorderEndpoint ? byOrder(result.data) : result.data,
      related: Object.fromEntries(related.map((item, index) => [item.key, relatedResults[index].data])),
    }
  }, [endpoint, related, reorderEndpoint])

  const load = useCallback(async () => {
    try {
      const data = await fetchAll()
      setRows(data.rows)
      setRelatedData(data.related)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [fetchAll])

  useEffect(() => {
    if (!endpoint) return undefined
    let cancelled = false
    fetchAll()
      .then((data) => {
        if (!cancelled) {
          setRows(data.rows)
          setRelatedData(data.related)
        }
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [endpoint, fetchAll])

  const { filters } = list
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const values = columns.map((column) => column.searchValue
        ? column.searchValue(row, relatedData)
        : column.value
          ? column.value(row, relatedData)
          : row[column.key])
      return matchesSearch(values, filters.q) && columns.every((column) => (
        !filters[column.key]
        || normalizeSearchText(column.value ? column.value(row, relatedData) : row[column.key]) === filters[column.key]
      ))
    })
  }, [columns, filters, relatedData, rows])

  const filterOptions = useMemo(() => columns
    .filter((column) => column.filterable !== false)
    .map((column) => {
      if (column.filterOptions) return { column, options: column.filterOptions }
      const options = new Map()
      rows.forEach((row) => {
        const value = column.value ? column.value(row, relatedData) : row[column.key]
        const normalized = normalizeSearchText(value)
        if (normalized) options.set(normalized, String(value))
      })
      return { column, options: [...options.entries()].sort((a, b) => a[1].localeCompare(b[1], 'fr')) }
    })
    .filter(({ column, options }) => column.filterOptions || (options.length > 1 && options.length <= 12)), [columns, relatedData, rows])
  const visible = paginate(filteredRows, list.page, list.pageSize)
  const formDirty = fields.some((field) => field.type === 'checkbox'
    ? Boolean(values[field.name]) !== Boolean(initialValues[field.name])
    : String(values[field.name] ?? '') !== String(initialValues[field.name] ?? ''))

  function openForm(row, nextValues) {
    setEditing(row)
    setModalOpen(true)
    setValues(nextValues)
    setInitialValues(nextValues)
    setError('')
    setFormError('')
    setFieldErrors({})
  }

  function openCreate() {
    openForm(null, emptyValues(fields, rows))
  }

  function openEdit(row) {
    openForm(row, Object.fromEntries(fields.map((field) => {
      const value = row[field.name]
      return [field.name, field.type === 'checkbox'
        ? Boolean(value)
        : field.type === 'date' && value
          ? String(value).slice(0, 10)
          : (value ?? '')]
    })))
  }

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setFormError('')
    setFieldErrors({})
    const payload = Object.fromEntries(fields.map((field) => {
      const value = values[field.name]
      if (field.type === 'checkbox') return [field.name, Boolean(value)]
      if (value === '') return [field.name, null]
      return [field.name, field.type === 'number' ? Number(value) : value]
    }))
    try {
      await apiRequest(editing ? `${endpoint}/${editing.id}` : endpoint, {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      })
      setModalOpen(false)
      setEditing(null)
      toast.success(editing ? messages.updated : messages.created)
      await load()
    } catch (saveError) {
      // Erreurs Laravel : sous chaque champ affiché ; celles sans champ visible restent en tête du formulaire.
      const validationErrors = saveError.data?.errors ?? {}
      const visibleFields = fields.filter((field) => !field.showWhen || field.showWhen(values, editing)).map((field) => field.name)
      const orphans = Object.entries(validationErrors).filter(([name]) => !visibleFields.includes(name)).flatMap(([, errors]) => errors)
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
      toast.success(row.actif ? messages.deactivated : messages.activated)
      await load()
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

  async function move(row, direction) {
    const index = rows.findIndex((item) => item.id === row.id)
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= rows.length) return
    const reordered = [...rows]
    reordered[index] = rows[newIndex]
    reordered[newIndex] = rows[index]
    setError('')
    try {
      const result = await apiRequest(reorderEndpoint, {
        method: 'PUT',
        body: JSON.stringify({ ids: reordered.map((item) => item.id) }),
      })
      setRows(result.data)
    } catch (moveError) {
      toast.error(`Le réordonnancement n’a pas abouti : ${moveError.message}`)
      await load()
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
        disabled={pending || loading || filteredRows.length === 0}
        onClick={() => downloadExcel(
          exportName ?? `${title.toLocaleLowerCase('fr').replaceAll(/[^a-z0-9]+/g, '-')}.xlsx`,
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
    const actions = []
    if (reorderEndpoint) {
      // Le classement n'a de sens que sur la liste complète, sans filtre.
      const index = rows.findIndex((item) => item.id === row.id)
      const movementDisabled = list.active || visible.page !== 1
      actions.push(
        { icon: 'arrow-up', label: 'Monter', disabled: movementDisabled || index === 0, onClick: () => move(row, -1) },
        { icon: 'arrow-down', label: 'Descendre', disabled: movementDisabled || index === rows.length - 1, onClick: () => move(row, 1) },
      )
    }
    actions.push({
      icon: 'edit',
      label: 'Modifier',
      onClick: () => openEdit(row),
    })
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
    return <RowActions actions={actions} maxVisible={reorderEndpoint ? 4 : undefined} />
  }

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

  const addButton = <Button disabled={!endpoint} icon="plus" onClick={openCreate}>{messages.add}</Button>

  return (
    <section className="admin-entity">
      <PageBanner actions={addButton} description={description} title={title} />

      {error && <Alert severity="error">{error}</Alert>}

      {wrapContent(
        <>
          <ListToolbar>
            <SearchField
              id={`${endpoint}-search`}
              placeholder={searchPlaceholder}
              value={filters.q}
              onChange={list.setFilter('q')}
            />
            {filterOptions.map(({ column, options }) => (
              <FilterSelect
                allLabel="Tous"
                key={column.key}
                label={column.label}
                options={options}
                value={filters[column.key] ?? ''}
                onChange={list.setFilter(column.key)}
              />
            ))}
            <ToolbarActions>
              <ResultCount count={filteredRows.length} />
              {list.active && (
                <Button type="button" variant="secondary" onClick={list.reset}>Réinitialiser</Button>
              )}
              {renderExportButton()}
            </ToolbarActions>
          </ListToolbar>

          <DataTable
            actions={renderRowActions}
            columns={columns}
            context={relatedData}
            emptyAction={list.active || !endpoint ? undefined : addButton}
            emptyDescription={list.active ? 'Modifiez la recherche ou réinitialisez les filtres.' : undefined}
            emptyMessage={list.active ? 'Aucun élément ne correspond à la recherche.' : messages.empty}
            loading={pending || loading}
            rows={visible.rows}
            variant="compact"
          />
          {!pending && !loading && filteredRows.length > 0 && (
            <ListPagination
              page={visible.page}
              pageSize={list.pageSize}
              total={filteredRows.length}
              onPageChange={list.setPage}
              onPageSizeChange={list.changePageSize}
            />
          )}
        </>,
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
        title={editing ? messages.editTitle(title) : messages.createTitle(title)}
      >
        <form className={`admin-entity__form${fields.length > 5 ? ' admin-entity__form--columns' : ''}`} id="admin-entity-form" noValidate onSubmit={save}>
          {formError && <Alert severity="error">{formError}</Alert>}
          {fields.map(renderField)}
        </form>
      </Modal>
      <ConfirmDialog
        busy={deactivating}
        confirmLabel="Désactiver"
        onCancel={() => setPendingDeactivation(null)}
        onConfirm={confirmDeactivation}
        open={Boolean(pendingDeactivation)}
        title={messages.confirmTitle}
      >
        {messages.confirmText}
      </ConfirmDialog>
    </section>
  )
}

export default AdminEntityPage
