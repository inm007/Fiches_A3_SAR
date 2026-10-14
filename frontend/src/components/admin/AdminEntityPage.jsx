import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../auth/api.js'
import Button from '../common/Button.jsx'
import Drawer from '../common/Drawer.jsx'
import './AdminEntityPage.css'

const EMPTY_RELATED = []

function emptyValues(fields) {
  return Object.fromEntries(fields.map((field) => [field.name, field.defaultValue ?? '']))
}

function AdminEntityPage({ title, description, endpoint, fields, columns, related = EMPTY_RELATED, extraActions }) {
  const [rows, setRows] = useState([])
  const [relatedData, setRelatedData] = useState({})
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [values, setValues] = useState(() => emptyValues(fields))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (!normalizedQuery) return rows
    return rows.filter((row) => columns.some((column) => {
      const value = column.value ? column.value(row, relatedData) : row[column.key]
      return String(value ?? '').toLocaleLowerCase().includes(normalizedQuery)
    }))
  }, [columns, query, relatedData, rows])

  function openCreate() {
    setEditing(null)
    setDrawerOpen(true)
    setValues(emptyValues(fields))
    setError('')
    setSuccess('')
  }

  function openEdit(row) {
    setEditing(row)
    setDrawerOpen(true)
    setValues(Object.fromEntries(fields.map((field) => {
      const value = row[field.name]
      return [field.name, field.type === 'date' && value ? String(value).slice(0, 10) : (value ?? '')]
    })))
    setError('')
    setSuccess('')
  }

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
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
      setDrawerOpen(false)
      setEditing(null)
      setSuccess(editing ? 'Modifications enregistrées.' : 'Élément créé.')
      await load()
    } catch (saveError) {
      const validationErrors = saveError.data?.errors
      setError(validationErrors
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

  return (
    <section className="admin-entity">
      <header className="admin-entity__header">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <Button onClick={openCreate}>Ajouter</Button>
      </header>

      {error && <p className="admin-entity__message admin-entity__message--error" role="alert">{error}</p>}
      {success && <p className="admin-entity__message admin-entity__message--success" role="status">{success}</p>}

      <div className="admin-entity__toolbar">
        <label htmlFor={`${endpoint}-search`}>Rechercher</label>
        <input
          id={`${endpoint}-search`}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Code, nom, courriel…"
          type="search"
          value={query}
        />
        <span>{filteredRows.length} résultat{filteredRows.length > 1 ? 's' : ''}</span>
      </div>

      <div className="admin-entity__table-wrap">
        <table className="admin-entity__table">
          <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}<th>Actions</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length + 1}>Chargement…</td></tr>
            ) : filteredRows.length === 0 ? (
              <tr><td colSpan={columns.length + 1}>Aucun élément trouvé.</td></tr>
            ) : filteredRows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render ? column.render(row, relatedData) : (column.value ? column.value(row, relatedData) : row[column.key]) ?? '—'}</td>
                ))}
                <td className="admin-entity__actions">
                  <Button onClick={() => openEdit(row)} variant="secondary">Modifier</Button>
                  {typeof row.actif === 'boolean' && (
                    <Button onClick={() => toggleActive(row)} variant="secondary">
                      {row.actif ? 'Désactiver' : 'Activer'}
                    </Button>
                  )}
                  {extraActions?.map((action) => (
                    <Button key={action.label} disabled={action.disabled?.(row)} onClick={() => runExtraAction(action, row)} variant="secondary">
                      {action.label}
                    </Button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Drawer open={drawerOpen} title={editing ? `Modifier — ${title}` : `Ajouter — ${title}`}>
        <form className="admin-entity__form" onSubmit={save}>
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
                    value={values[field.name]}
                  />
                )}
                {field.hint && <small>{field.hint}</small>}
              </label>
            )
          })}
          <div className="admin-entity__form-actions">
            <Button disabled={saving} type="submit">{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
            <Button onClick={() => setDrawerOpen(false)} type="button" variant="secondary">Annuler</Button>
          </div>
        </form>
      </Drawer>
    </section>
  )
}

export default AdminEntityPage
