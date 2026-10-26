import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../auth/api.js'
import { useAuth } from '../../auth/useAuth.js'
import EtapeBadge from '../../components/fiche/EtapeBadge.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import { TextArea } from '../../components/ui/FormControls.jsx'
import { refreshCounters } from '../../hooks/useCounters.js'
import { describeError, ficheService } from '../../services/ficheService.js'
import { DECIDING_ROLES } from '../../utils/constants.js'
import { formatDate, formatFcfa } from '../../utils/format.js'
import { toast } from '../../utils/toast.js'
import './AFaire.css'

const PORTES = { 0: 'Juger la pertinence', 1: 'Valider le plan d’actions', 2: 'Valider la clôture' }

// Ce que le pilote doit faire à chaque étape de sa fiche.
const SUITE = {
  OUVERT: 'Remplir les sections 1 à 4, puis soumettre au chef de département',
  EN_VALIDATION_PERTINENCE: 'Attend la décision du chef de département',
  EN_COURS: 'Analyser les causes et construire le plan (sections 5 à 7)',
  EN_VALIDATION_PLAN: 'Attend la validation des directeurs',
  REALISATION_ACTIONS: 'Suivre la réalisation des actions',
  MESURE_RESULTATS: 'Mesurer les résultats (section 8)',
  VERIFICATION_MAINTIEN: 'Contrôles d’efficacité et maintien du résultat',
  EN_VALIDATION_CLOTURE: 'Attend la validation de la clôture',
  EN_ATTENTE: 'Fiche en attente',
}

const FINALES = ['CLOTURE', 'CLASSE_SANS_SUITE']

function Section({ title, count, children }) {
  return (
    <section className="afaire__section">
      <h2>{title}{count > 0 && <span className="afaire__count">{count}</span>}</h2>
      {children}
    </section>
  )
}

function Vide({ children }) {
  return <p className="afaire__vide">{children}</p>
}

function Validations({ demandes, onDecided }) {
  const [refus, setRefus] = useState(null)
  const [commentaire, setCommentaire] = useState('')
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)

  async function decide(demande, decision) {
    setBusy(demande.id)
    setError(null)
    try {
      await ficheService.decision(demande.id, { decision, commentaire: commentaire || null, retour: demande.porte === 2 ? 'VERIFICATION_MAINTIEN' : null })
      toast(decision === 'VALIDE' ? `${demande.fiche.numero_a3} : approuvée` : `${demande.fiche.numero_a3} : renvoyée au pilote`)
      setRefus(null)
      setCommentaire('')
      refreshCounters()
      onDecided()
    } catch (decisionError) {
      setRefus(null)
      setError(describeError(decisionError))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Section count={demandes.length} title="Décisions attendues">
      {error && (
        <Alert severity="error">
          {error.message}
          {error.manques.length > 0 && <ul>{error.manques.map((manque) => <li key={manque}>{manque}</li>)}</ul>}
        </Alert>
      )}
      {demandes.length === 0 ? <Vide>Aucune décision ne vous attend.</Vide> : (
        <ul className="afaire__liste">
          {demandes.map((demande) => (
            <li className="afaire__ligne" key={demande.id}>
              <Link className="afaire__texte" to={`/fiches/${demande.fiche.id}`}>
                <strong>{PORTES[demande.porte]}</strong>
                <span>{demande.fiche.numero_a3} · {demande.fiche.titre}</span>
              </Link>
              <span className={`afaire__delai${demande.anciennete_jours >= 7 ? ' is-late' : ''}`}>depuis {demande.anciennete_jours} j</span>
              <div className="afaire__boutons">
                <Button disabled={Boolean(busy)} loading={busy === demande.id} size="small" type="button" variant="success" onClick={() => decide(demande, 'VALIDE')}>Approuver</Button>
                <Button disabled={Boolean(busy)} size="small" type="button" variant="secondary" onClick={() => setRefus(demande)}>Refuser</Button>
              </div>
            </li>
          ))}
        </ul>
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
        <p className="sar-muted">Le pilote reçoit votre commentaire. {refus?.porte === 2 && 'La fiche revient à la vérification du maintien.'}</p>
        <TextArea label="Motif du refus" required rows={4} value={commentaire} onChange={setCommentaire} />
      </ConfirmDialog>
    </Section>
  )
}

function Taches({ items }) {
  return (
    <Section count={items.length} title="Actions et contrôles">
      {items.length === 0 ? <Vide>Rien en retard, aucun contrôle à faire.</Vide> : (
        <ul className="afaire__liste">
          {items.map((item) => (
            <li className="afaire__ligne" key={`${item.type}-${item.fiche_id}-${item.libelle}`}>
              <Link className="afaire__texte" to={`/fiches/${item.fiche_id}`}>
                <strong>{item.libelle}</strong>
                <span>{item.numero_a3}</span>
              </Link>
              <span className={`afaire__delai${item.type === 'retard' ? ' is-late' : ''}`}>{item.type === 'retard' ? `${item.delai} de retard` : item.delai}</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function MesFiches({ fiches, pilote }) {
  return (
    <Section count={fiches.length} title={pilote ? 'Mes fiches' : 'Mes déclarations'}>
      {fiches.length === 0 ? <Vide>Aucune fiche en cours.</Vide> : (
        <ul className="afaire__liste">
          {fiches.map((fiche) => (
            <li className="afaire__ligne" key={fiche.id}>
              <Link className="afaire__texte" to={`/fiches/${fiche.id}`}>
                <strong>{fiche.titre}</strong>
                <span>{fiche.numero_a3}{pilote && SUITE[fiche.statut_etape] ? ` · ${SUITE[fiche.statut_etape]}` : ''}</span>
              </Link>
              {fiche.date_cible && <span className={`afaire__delai${fiche.en_retard ? ' is-late' : ''}`}>cible {formatDate(fiche.date_cible)}</span>}
              <EtapeBadge etape={fiche.statut_etape} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function Chiffres({ data, admin }) {
  const chiffres = [
    ['Fiches en cours', data.fiches_ouvertes, '/fiches'],
    ['En retard sur la date cible', data.fiches_en_retard, '/fiches'],
    ...(admin
      ? [['Sans pilote', data.fiches_sans_pilote, '/fiches'], ['Affectations actives', data.affectations_actives, '/admin/affectations']]
      : [['Taux de clôture', data.taux_cloture === null ? '—' : `${String(data.taux_cloture).replace('.', ',')} %`], ['Gains validés cette année', formatFcfa(data.gains_valides_annee)]]),
  ]
  return (
    <div className="afaire__chiffres">
      {chiffres.map(([label, valeur, to]) => {
        const contenu = <><strong>{valeur ?? 0}</strong><span>{label}</span></>
        return to ? <Link className="afaire__chiffre" key={label} to={to}>{contenu}</Link> : <div className="afaire__chiffre" key={label}>{contenu}</div>
      })}
    </div>
  )
}

/**
 * Page d'accueil : ce qui attend la personne sur son profil actif, rien d'autre.
 * Les données viennent des mêmes API qu'avant (/tableau-de-bord, /validations, /fiches).
 */
function AFaire() {
  const { activeProfile, user } = useAuth()
  const role = activeProfile?.role_code
  const decide = DECIDING_ROLES.includes(role)
  const pilote = role === 'PILOTE'
  const redige = pilote || role === 'AGENT'
  const userId = user?.id
  const [data, setData] = useState(null)
  const [demandes, setDemandes] = useState([])
  const [fiches, setFiches] = useState([])
  const [error, setError] = useState('')

  const load = useCallback(() => Promise.all([
    apiRequest('/tableau-de-bord').then((result) => result.data),
    decide ? ficheService.validations() : Promise.resolve([]),
    redige ? ficheService.list(pilote ? { pilote_id: userId, per_page: 50 } : { per_page: 50 }).then((result) => result.data) : Promise.resolve([]),
  ]).then(([tableau, validations, liste]) => {
    setData(tableau)
    setDemandes(validations)
    setFiches(liste.filter((fiche) => !FINALES.includes(fiche.statut_etape)))
  }).catch((loadError) => setError(loadError.message)), [decide, redige, pilote, userId])

  useEffect(() => { load() }, [load])

  if (error) return <Alert severity="error">{error}</Alert>
  if (!data) return <p className="afaire__vide">Chargement…</p>

  // Les validations ont leur propre bloc ; le reste de la liste « à traiter » du serveur va ici.
  const taches = data.a_traiter.filter((item) => item.type !== 'validation')
  const vueGlobale = ['DIRECTION', 'CONTROLE_GESTION', 'ADMIN_FONCTIONNEL'].includes(role)

  return (
    <div className="afaire">
      <header className="afaire__entete">
        <h1>Bonjour {user?.prenom}</h1>
        <p>{activeProfile?.label}</p>
      </header>
      {vueGlobale && <Chiffres admin={role === 'ADMIN_FONCTIONNEL'} data={data} />}
      {decide && <Validations demandes={demandes} onDecided={load} />}
      {(taches.length > 0 || redige) && <Taches items={taches} />}
      {redige && <MesFiches fiches={fiches} pilote={pilote} />}
    </div>
  )
}

export default AFaire
