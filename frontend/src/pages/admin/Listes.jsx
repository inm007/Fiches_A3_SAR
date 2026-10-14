import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../../auth/api.js'
import Button from '../../components/common/Button.jsx'
import Drawer from '../../components/common/Drawer.jsx'
import './Listes.css'

function Listes() {
  const [lists, setLists] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [values, setValues] = useState([])
  const [editing, setEditing] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState({ code: '', libelle: '', ordre: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

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
  }

  function startCreate() {
    const nextOrder = values.reduce((max, item) => Math.max(max, Number(item.ordre) || 0), 0) + 1
    setEditing(null)
    setDrawerOpen(true)
    setForm({ code: '', libelle: '', ordre: nextOrder })
    setError('')
    setNotice('')
  }

  function startEdit(item) {
    setEditing(item)
    setDrawerOpen(true)
    setForm({ code: item.code, libelle: item.libelle, ordre: item.ordre })
    setError('')
    setNotice('')
  }

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await apiRequest(`/admin/lists/${selectedId}/values${editing ? `/${editing.id}` : ''}`, {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(form),
      })
      setDrawerOpen(false)
      setEditing(null)
      setNotice(editing ? 'Valeur mise à jour.' : 'Valeur ajoutée.')
      await loadValues(selectedId)
    } catch (saveError) {
      const validationErrors = saveError.data?.errors
      setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : saveError.message)
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
          <div className="listes-page__table-wrap">
            <table>
              <thead><tr><th>Code</th><th>Libellé</th><th>Ordre</th><th>Actif</th><th>Actions</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5">Chargement…</td></tr>
                ) : values.length === 0 ? (
                  <tr><td colSpan="5">Aucune valeur dans cette liste.</td></tr>
                ) : [...values].sort((a, b) => a.ordre - b.ordre).map((item, index, ordered) => (
                  <tr key={item.id}>
                    <td>{item.code}</td>
                    <td>{item.libelle}</td>
                    <td>{item.ordre}</td>
                    <td>{item.actif ? 'Oui' : 'Non'}</td>
                    <td className="listes-page__actions">
                      <Button disabled={index === 0} onClick={() => move(item, -1)} variant="secondary">Monter</Button>
                      <Button disabled={index === ordered.length - 1} onClick={() => move(item, 1)} variant="secondary">Descendre</Button>
                      <Button onClick={() => startEdit(item)} variant="secondary">Modifier</Button>
                      <Button onClick={() => toggleActive(item)} variant="secondary">{item.actif ? 'Désactiver' : 'Activer'}</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <Drawer open={drawerOpen} title={editing ? 'Modifier une valeur' : 'Ajouter une valeur'}>
        <form className="listes-page__form" onSubmit={save}>
          <label>Code<input maxLength="255" onChange={(event) => setForm({ ...form, code: event.target.value })} required value={form.code} /></label>
          <label>Libellé<input maxLength="255" onChange={(event) => setForm({ ...form, libelle: event.target.value })} required value={form.libelle} /></label>
          <label>Ordre<input min="0" onChange={(event) => setForm({ ...form, ordre: Number(event.target.value) })} required type="number" value={form.ordre} /></label>
          <div className="listes-page__form-actions">
            <Button disabled={saving} type="submit">{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
            <Button onClick={() => setDrawerOpen(false)} type="button" variant="secondary">Annuler</Button>
          </div>
        </form>
      </Drawer>
    </section>
  )
}

export default Listes
