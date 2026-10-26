import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import PageBanner from '../../components/shared/PageBanner.jsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import ListPagination from '../../components/ui/ListPagination.jsx'
import { TextArea } from '../../components/ui/FormControls.jsx'
import Badge from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { ListToolbar, ResultCount, SearchField, ToolbarActions } from '../../components/shared/ListToolbar.jsx'
import { refreshCounters } from '../../hooks/useCounters.js'
import { useListFilters } from '../../hooks/useListFilters.js'
import { describeError, ficheService } from '../../services/ficheService.js'
import { toast } from '../../utils/toast.js'
import { matchesSearch, paginate } from '../../utils/listTools.js'
import './Validations.css'

const SEUIL_ANCIENNETE = 7
const NO_FILTERS = { q: '' }

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
  const [busy, setBusy] = useState(null)
  const list = useListFilters(NO_FILTERS)
  const { filters, setPage } = list

  const load = useCallback(() => ficheService.validations()
    .then((result) => { setDemandes(result); setPage(1) })
    .catch((loadError) => setError(describeError(loadError))), [setPage])

  useEffect(() => { load() }, [load])

  async function decide(demande, decision) {
    setBusy(demande.id)
    setError(null)
    try {
      await ficheService.decision(demande.id, { decision, commentaire: commentaire || null, retour: demande.porte === 2 ? 'VERIFICATION_MAINTIEN' : null })
      toast(decision === 'VALIDE' ? `${demande.fiche.numero_a3} — demande approuvée` : `${demande.fiche.numero_a3} — renvoyée au pilote, qui est notifié`)
      setRefus(null)
      setCommentaire('')
      refreshCounters()
      load()
    } catch (decisionError) {
      setRefus(null)
      setError(describeError(decisionError))
    } finally {
      setBusy(null)
    }
  }

  const filteredDemandes = (demandes ?? []).filter((demande) => (
    matchesSearch([
      demande.fiche.numero_a3,
      demande.fiche.titre,
      demande.role,
      `porte ${demande.porte}`,
      demande.anciennete_jours,
    ], filters.q)
  ))
  const visible = paginate(filteredDemandes, list.page, list.pageSize)

  return (
    <section className="validations-page">
      <PageBanner title="Validations à traiter" />
      {error && (
        <Alert severity="error">
          {error.message}
          {error.manques.length > 0 && <ul>{error.manques.map((manque) => <li key={manque}>{manque}</li>)}</ul>}
        </Alert>
      )}
      {!demandes && !error && <DataTable columns={[{ key: 'a', label: 'N° A3' }, { key: 'b', label: 'Titre' }, { key: 'c', label: 'Porte' }, { key: 'd', label: 'Ancienneté' }]} loading rows={[]} variant="compact" />}
      {demandes?.length === 0 && <div className="sar-card"><EmptyState description="Les demandes qui vous sont adressées sur ce profil apparaîtront ici." icon="ok" title="Aucune demande en attente" /></div>}
      {demandes?.length > 0 && (
        <>
          <ListToolbar className="validations-page__toolbar">
            <SearchField placeholder="N°, titre, rôle…" value={filters.q} onChange={list.setFilter('q')} />
            <ToolbarActions>
              <ResultCount count={filteredDemandes.length} singular="demande" />
              {list.active && <Button type="button" variant="secondary" onClick={list.reset}>Réinitialiser</Button>}
            </ToolbarActions>
          </ListToolbar>
          <DataTable
            actionsWidth="280px"
            actions={(demande) => (
              <div className="sar-list-actions">
                <Button size="small" type="button" variant="secondary" onClick={() => navigate(`/fiches/${demande.fiche.id}`)}>Ouvrir</Button>
                <Button disabled={Boolean(busy)} loading={busy === demande.id} size="small" type="button" variant="success" onClick={() => decide(demande, 'VALIDE')}>Approuver</Button>
                <Button disabled={Boolean(busy)} size="small" type="button" variant="danger" onClick={() => setRefus(demande)}>Refuser</Button>
              </div>
            )}
            columns={[
              { key: 'numero', label: 'N° A3', width: '140px', render: (demande) => <strong className="sar-num">{demande.fiche.numero_a3}</strong> },
              { key: 'titre', label: 'Titre', render: (demande) => <span className="data-table__cell-text" title={demande.fiche.titre}>{demande.fiche.titre}</span> },
              { key: 'porte', label: 'Porte', width: '96px', render: (demande) => `Porte ${demande.porte}` },
              { key: 'role', label: 'Rôle demandé', width: '20%', render: (demande) => <span className="data-table__cell-text" title={demande.role}>{demande.role}</span> },
              {
                key: 'anciennete',
                label: 'Ancienneté',
                width: '116px',
                render: (demande) => (demande.anciennete_jours >= SEUIL_ANCIENNETE
                  ? <Badge icon="clock" tone="error">{demande.anciennete_jours} j</Badge>
                  : <span className="sar-num">{demande.anciennete_jours} j</span>),
              },
            ]}
            emptyAction={<Button type="button" variant="secondary" onClick={list.reset}>Réinitialiser les filtres</Button>}
            emptyMessage="Aucune demande ne correspond à ces critères"
            rows={visible.rows}
            variant="compact"
          />
          {filteredDemandes.length > 0 && (
            <ListPagination
              page={visible.page}
              pageSize={list.pageSize}
              total={filteredDemandes.length}
              onPageChange={setPage}
              onPageSizeChange={list.changePageSize}
            />
          )}
        </>
      )}
      <ConfirmDialog
        busy={Boolean(busy)}
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
