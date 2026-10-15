import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import PageBanner from '../../components/shared/PageBanner.jsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import ListPagination from '../../components/ui/ListPagination.jsx'
import { TextArea } from '../../components/ui/FormControls.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import { refreshCounters } from '../../hooks/useCounters.js'
import { describeError, ficheService } from '../../services/ficheService.js'
import { toast } from '../../utils/toast.js'
import { downloadExcel, matchesSearch } from '../../utils/listTools.js'
import './Validations.css'

const SEUIL_ANCIENNETE = 7
const PAGE_SIZE = 25

/**
 * Demandes qui attendent le profil actif, les plus anciennes en premier (UX §9.1).
 * Le serveur reste juge : B7, B8 et les gains à valider renvoient un message clair.
 */
function Validations() {
  const navigate = useNavigate()
  const [demandes, setDemandes] = useState(null)
  const [error, setError] = useState(null)
  const [refus, setRefus] = useState(null)
  const [commentaire, setCommentaire] = useState('')
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [porteFilter, setPorteFilter] = useState('')
  const [ancienneteFilter, setAncienneteFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)

  const load = useCallback(() => ficheService.validations()
    .then((result) => { setDemandes(result); setPage(1) })
    .catch((loadError) => setError(describeError(loadError))), [])

  useEffect(() => { load() }, [load])

  async function decide(demande, decision) {
    setBusy(true)
    setError(null)
    try {
      await ficheService.decision(demande.id, { decision, commentaire: commentaire || null, retour: demande.porte === 2 ? 'VERIFICATION_MAINTIEN' : null })
      toast(decision === 'VALIDE' ? `${demande.fiche.numero_a3} — demande approuvée` : `${demande.fiche.numero_a3} — refus enregistré, le pilote est notifié`)
      setRefus(null)
      setCommentaire('')
      refreshCounters()
      load()
    } catch (decisionError) {
      setRefus(null)
      setError(describeError(decisionError))
    } finally {
      setBusy(false)
    }
  }

  const filteredDemandes = (demandes ?? []).filter((demande) => (
    matchesSearch([
      demande.fiche.numero_a3,
      demande.fiche.titre,
      demande.role,
      `porte ${demande.porte}`,
      demande.anciennete_jours,
    ], query)
    && (!porteFilter || String(demande.porte) === porteFilter)
    && (!ancienneteFilter || (ancienneteFilter === 'ancienne' ? demande.anciennete_jours >= SEUIL_ANCIENNETE : demande.anciennete_jours < SEUIL_ANCIENNETE))
  ))
  const visibleDemandes = filteredDemandes.slice((page - 1) * pageSize, page * pageSize)

  return (
    <section className="validations-page">
      <PageBanner title="Validations à traiter" />
      {error && (
        <Alert severity="error">
          {error.message}
          {error.manques.length > 0 && <ul>{error.manques.map((manque) => <li key={manque}>{manque}</li>)}</ul>}
        </Alert>
      )}
      {!demandes && !error && <Skeleton lines={5} height={22} />}
      {demandes?.length === 0 && <EmptyState description="Les demandes qui vous sont adressées sur ce profil apparaîtront ici." title="Aucune demande en attente" />}
      {demandes?.length > 0 && (
        <div className="sar-card validations-page__card">
          <div className="validations-page__toolbar sar-list-toolbar">
            <label className="sar-list-toolbar__search">Rechercher<input placeholder="N°, titre, rôle…" onChange={(event) => { setQuery(event.target.value); setPage(1) }} type="search" value={query} /></label>
            <label>Porte<select onChange={(event) => { setPorteFilter(event.target.value); setPage(1) }} value={porteFilter}><option value="">Toutes</option><option value="1">Porte 1</option><option value="2">Porte 2</option></select></label>
            <label>Ancienneté<select onChange={(event) => { setAncienneteFilter(event.target.value); setPage(1) }} value={ancienneteFilter}><option value="">Toutes</option><option value="ancienne">7 jours et plus</option><option value="recente">Moins de 7 jours</option></select></label>
            {(query || porteFilter || ancienneteFilter) && <Button type="button" variant="secondary" onClick={() => { setQuery(''); setPorteFilter(''); setAncienneteFilter(''); setPage(1) }}>Réinitialiser</Button>}
            <span className="sar-list-toolbar__count">{filteredDemandes.length} demande{filteredDemandes.length > 1 ? 's' : ''}</span>
            <Button disabled={!filteredDemandes.length} type="button" variant="export" onClick={() => downloadExcel('validations-a-traiter.xlsx', [
              { label: 'N° A3', value: (demande) => demande.fiche.numero_a3 },
              { label: 'Titre', value: (demande) => demande.fiche.titre },
              { label: 'Porte', value: (demande) => demande.porte },
              { label: 'Rôle demandé', value: (demande) => demande.role },
              { label: 'Demandée le', value: (demande) => demande.demandee_le },
              { label: 'Ancienneté (jours)', value: (demande) => demande.anciennete_jours },
            ], filteredDemandes)}>Exporter Excel</Button>
          </div>
          <table className="sar-table">
            <thead><tr><th>N° A3</th><th>Titre</th><th>Porte</th><th>Rôle demandé</th><th>Ancienneté</th><th /></tr></thead>
            <tbody>
              {visibleDemandes.map((demande) => (
                <tr key={demande.id}>
                  <td><b>{demande.fiche.numero_a3}</b></td>
                  <td>{demande.fiche.titre}</td>
                  <td>Porte {demande.porte}</td>
                  <td>{demande.role}</td>
                  <td className={demande.anciennete_jours >= SEUIL_ANCIENNETE ? 'validations-page__old' : 'validations-page__age'}>{demande.anciennete_jours} j</td>
                  <td className="validations-page__actions sar-list-actions">
                    <Button size="small" type="button" variant="secondary" onClick={() => navigate(`/fiches/${demande.fiche.id}`)}>Ouvrir</Button>
                    <Button disabled={busy} size="small" type="button" variant="success" onClick={() => decide(demande, 'VALIDE')}>Approuver</Button>
                    <Button disabled={busy} size="small" type="button" variant="danger" onClick={() => setRefus(demande)}>Refuser</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredDemandes.length === 0 && <EmptyState title="Aucune demande ne correspond à ces critères." />}
          {filteredDemandes.length > 0 && (
            <ListPagination
              page={page}
              pageSize={pageSize}
              total={filteredDemandes.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
            />
          )}
        </div>
      )}
      <ConfirmDialog
        busy={busy}
        confirmLabel="Confirmer le refus"
        disabled={!commentaire.trim()}
        open={Boolean(refus)}
        title="Refuser la demande"
        onCancel={() => setRefus(null)}
        onConfirm={() => decide(refus, 'REFUSE')}
      >
        <p className="sar-muted">Un commentaire est obligatoire (règle B6). {refus?.porte === 2 && 'La fiche revient à la vérification du maintien.'}</p>
        <TextArea label="Motif du refus" required rows={4} value={commentaire} onChange={setCommentaire} />
      </ConfirmDialog>
    </section>
  )
}

export default Validations
