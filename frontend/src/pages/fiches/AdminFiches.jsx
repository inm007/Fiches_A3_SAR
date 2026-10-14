import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../auth/api.js'
import Button from '../../components/common/Button.jsx'
import Drawer from '../../components/common/Drawer.jsx'
import './AdminFiches.css'

function assignmentIsCurrent(assignment) {
  const today = new Date().toISOString().slice(0, 10)
  return assignment.actif
    && (!assignment.date_debut || String(assignment.date_debut).slice(0, 10) <= today)
    && (!assignment.date_fin || String(assignment.date_fin).slice(0, 10) >= today)
}

function AdminFiches() {
  const [fiches, setFiches] = useState([])
  const [users, setUsers] = useState([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [piloteId, setPiloteId] = useState('')
  const [confidentialite, setConfidentialite] = useState('NORMAL')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

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
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (!normalizedQuery) return fiches
    return fiches.filter((fiche) => [
      fiche.numero_a3,
      fiche.titre,
      fiche.unite?.libelle,
      fiche.pilote ? `${fiche.pilote.prenom} ${fiche.pilote.nom}` : '',
      fiche.statut_etape,
    ].join(' ').toLocaleLowerCase().includes(normalizedQuery))
  }, [fiches, query])

  const eligiblePilots = useMemo(() => {
    if (!selected) return []
    return users.filter((user) => user.actif && user.affectations.some((assignment) => (
      assignment.role?.code === 'PILOTE'
      && assignment.unite_id === selected.unite?.id
      && assignmentIsCurrent(assignment)
    )))
  }, [selected, users])

  function openFiche(fiche) {
    setSelected(fiche)
    setPiloteId(fiche.pilote ? String(fiche.pilote.id) : '')
    setConfidentialite(fiche.confidentialite)
    setError('')
    setNotice('')
  }

  async function save(event) {
    event.preventDefault()
    if (!selected) return
    setSaving(true)
    setError('')
    setNotice('')
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
      setNotice('La désignation et la confidentialité ont été enregistrées.')
    } catch (saveError) {
      const validationErrors = saveError.data?.errors
      setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : saveError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-fiches">
      <header className="admin-fiches__header">
        <div>
          <h1>Registre des fiches A3</h1>
          <p>Consultation des fiches, désignation du pilote et gestion de la confidentialité. Le contenu métier reste en lecture seule.</p>
        </div>
      </header>
      {error && <p className="admin-fiches__message admin-fiches__message--error" role="alert">{error}</p>}
      {notice && <p className="admin-fiches__message admin-fiches__message--success" role="status">{notice}</p>}
      <div className="admin-fiches__toolbar">
        <label htmlFor="admin-fiches-search">Rechercher une fiche</label>
        <input id="admin-fiches-search" onChange={(event) => setQuery(event.target.value)} type="search" value={query} />
        <span>{filteredFiches.length} fiche{filteredFiches.length > 1 ? 's' : ''}</span>
      </div>
      <div className="admin-fiches__table-wrap">
        <table>
          <thead><tr><th>N° A3</th><th>Titre</th><th>Unité</th><th>Pilote</th><th>Étape</th><th>Confidentialité</th><th>Action</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7">Chargement…</td></tr>
            ) : filteredFiches.length === 0 ? (
              <tr><td colSpan="7">Aucune fiche trouvée.</td></tr>
            ) : filteredFiches.map((fiche) => (
              <tr key={fiche.id}>
                <td><Link className="admin-fiches__link" to={`/fiches/${fiche.id}`}>{fiche.numero_a3}</Link></td>
                <td>{fiche.titre}</td>
                <td>{fiche.unite?.libelle ?? '—'}</td>
                <td>{fiche.pilote ? `${fiche.pilote.prenom} ${fiche.pilote.nom}` : 'Non désigné'}</td>
                <td>{fiche.statut_etape.replaceAll('_', ' ')}</td>
                <td>{fiche.confidentialite === 'RESTREINT' ? 'Restreint' : 'Normal'}</td>
                <td><Button onClick={() => openFiche(fiche)} variant="secondary">Gérer</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Drawer open={selected !== null} title={selected ? `Gestion de ${selected.numero_a3}` : 'Gestion de la fiche'}>
        {selected && (
          <form className="admin-fiches__form" onSubmit={save}>
            <div className="admin-fiches__summary">
              <strong>{selected.titre}</strong>
              <span>{selected.unite?.libelle ?? 'Unité inconnue'} · {selected.statut_etape.replaceAll('_', ' ')}</span>
            </div>
            <label>
              Confidentialité
              <select onChange={(event) => setConfidentialite(event.target.value)} value={confidentialite}>
                <option value="NORMAL">Normal</option>
                <option value="RESTREINT">Restreint</option>
              </select>
            </label>
            {selected.statut_etape === 'OUVERT' ? (
              <label>
                Pilote
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
            <p className="admin-fiches__readonly">Les autres données de la fiche restent consultables sans être modifiables par l’administrateur fonctionnel.</p>
            <div className="admin-fiches__actions">
              <Button disabled={saving} type="submit">{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
              <Button onClick={() => setSelected(null)} type="button" variant="secondary">Fermer</Button>
            </div>
          </form>
        )}
      </Drawer>
    </section>
  )
}

export default AdminFiches
