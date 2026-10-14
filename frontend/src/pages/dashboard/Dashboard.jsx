import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRequest } from '../../auth/api.js'
import { useAuth } from '../../auth/useAuth.js'
import Alert from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Icon from '../../components/common/Icon.jsx'
import Skeleton from '../../components/common/Skeleton.jsx'
import { ETAPES, PARCOURS } from '../../utils/constants.js'
import { formatFcfa } from '../../utils/format.js'
import './Dashboard.css'

const percent = (value) => (value === null || value === undefined ? '—' : `${String(value).replace('.', ',')} %`)
const days = (value) => (value === null || value === undefined ? '—' : `${value} j`)
const shortFcfa = (value) => (Math.abs(value) >= 1_000_000 ? `${(value / 1_000_000).toFixed(1).replace('.', ',')} M FCFA` : formatFcfa(value))

// Cartes de chiffres par profil (UX §6) : [libellé, clé, icône, format].
const kpis = {
  AGENT: [['Mes fiches', 'mes_fiches', 'file'], ['Mes actions à faire', 'mes_actions_a_faire', 'ok'], ['Mes actions en retard', 'mes_actions_en_retard', 'clock'], ['Fiches en attente', 'par_etape.EN_ATTENTE', 'al']],
  PILOTE: [['Mes fiches', 'mes_fiches', 'file'], ['Actions en retard', 'actions_en_retard', 'clock'], ['Validations en attente', 'validations_en_attente_sur_mes_fiches', 'ok'], ['Contrôles disponibles', 'controles_disponibles', 'al']],
  VALIDEUR: [['Fiches à valider', 'validations_a_traiter', 'ok'], ['Décisions récentes (30 j)', 'decisions_recentes', 'file'], ['Plus ancienne demande', 'plus_ancienne_demande_jours', 'clock', days], ['Fiches de mon périmètre', 'fiches_total', 'users']],
  CONTROLE_GESTION: [['Gains à valider', 'gains_a_valider', 'ok'], ['Gains validés de l’année', 'gains_valides_annee', 'file', shortFcfa], ['Gain net annuel validé', 'gain_net_annuel_valide', 'users', shortFcfa], ['Validations à traiter', 'validations_a_traiter', 'clock']],
  DIRECTION: [['Fiches ouvertes', 'fiches_ouvertes', 'file'], ['Taux de clôture', 'taux_cloture', 'ok', percent], ['Délai moyen de clôture', 'delai_moyen_cloture_jours', 'clock', days], ['Gain net annuel validé', 'gain_net_annuel_valide', 'users', shortFcfa]],
  ADMIN_FONCTIONNEL: [['Fiches sans pilote', 'fiches_sans_pilote', 'al'], ['Affectations actives', 'affectations_actives', 'users'], ['Fiches ouvertes', 'fiches_ouvertes', 'file'], ['Actions en retard', 'actions_en_retard', 'clock']],
}

const typeIcons = { validation: 'ok', retard: 'al', controle: 'clock', pilote: 'users' }

function valueOf(data, path) {
  return path.split('.').reduce((current, key) => current?.[key], data)
}

function Dashboard() {
  const { activeProfile, user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const roleCode = activeProfile?.role_code
  const cards = kpis[roleCode] ?? (roleCode?.startsWith('VALIDEUR_') ? kpis.VALIDEUR : kpis.AGENT)
  const canDeclare = ['AGENT', 'PILOTE'].includes(roleCode)

  useEffect(() => {
    apiRequest('/tableau-de-bord').then((result) => setData(result.data)).catch((loadError) => setError(loadError.message))
  }, [roleCode])

  const today = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Dakar', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  const maxEtape = Math.max(1, ...Object.values(data?.par_etape ?? {}))
  const aTraiter = data?.a_traiter ?? []
  const retards = aTraiter.filter((item) => item.type === 'retard').length

  return (
    <section className="dashboard-page">
      <header className="sar-page-head">
        <div>
          <h1>Bonjour, {user?.prenom}</h1>
          <div className="sar-muted">{activeProfile?.label} · {today}</div>
        </div>
        {canDeclare && <Button type="button" onClick={() => navigate('/fiches/nouvelle')}><Icon name="plus" />Nouvelle fiche</Button>}
      </header>

      {error && <Alert severity="error">{error}</Alert>}

      <div className="dashboard-page__hero">
        <div>
          <div className="dashboard-page__eyebrow">Vos priorités du jour</div>
          <h2>{aTraiter.length === 0 ? 'Rien n’attend votre action' : `${aTraiter.length} élément(s) attendent votre action`}</h2>
          <div className="dashboard-page__hero-text">
            {data ? `${retards} action(s) en retard · ${data.validations_a_traiter} validation(s) à traiter` : 'Chargement des indicateurs…'}
          </div>
        </div>
        <Button type="button" variant="secondary" onClick={() => navigate('/fiches')}>Voir les fiches <Icon name="arrow" /></Button>
      </div>

      <div className="dashboard-page__kpis">
        {cards.map(([label, key, icon, format], index) => (
          <article className="sar-card dashboard-page__kpi" key={key} style={{ animationDelay: `${index * 80}ms` }}>
            <div className="dashboard-page__kpi-label"><span className={`dashboard-page__kpi-tile dashboard-page__kpi-tile--${index}`}><Icon name={icon} /></span>{label}</div>
            <div className="dashboard-page__kpi-value">{data ? (format ?? String)(valueOf(data, key) ?? 0) : <Skeleton height={28} width="50%" />}</div>
          </article>
        ))}
      </div>

      <div className="dashboard-page__grid">
        <article className="sar-card">
          <h2>Fiches par étape</h2>
          {!data && <Skeleton />}
          {data && data.fiches_total === 0 && <p className="sar-muted">Aucune fiche visible pour ce profil. Les fiches apparaîtront ici dès leur déclaration.</p>}
          {data && data.fiches_total > 0 && [...PARCOURS, 'EN_ATTENTE'].map((etape) => (
            <div className="dashboard-page__bar" key={etape}>
              <span>{ETAPES[etape].label}</span>
              <i style={{ width: `${(data.par_etape[etape] / maxEtape) * 100}%`, background: `var(--st-${ETAPES[etape].tone})` }} />
              <b>{data.par_etape[etape]}</b>
            </div>
          ))}
        </article>
        <article className="sar-card">
          <h2>À traiter</h2>
          {data && aTraiter.length === 0 && <p className="sar-muted">Rien à traiter pour l’instant.</p>}
          {aTraiter.map((item) => (
            <Link className="sar-list-item dashboard-page__todo" key={`${item.type}-${item.fiche_id}-${item.libelle}`} to={`/fiches/${item.fiche_id}`}>
              <span className={`sar-tile${item.type === 'retard' ? ' sar-tile--alert' : ''}`}><Icon name={typeIcons[item.type]} /></span>
              <div><b>{item.numero_a3}</b><div className="sar-muted">{item.libelle}</div></div>
              <span className="sar-muted dashboard-page__todo-delay">{item.delai}</span>
            </Link>
          ))}
        </article>
      </div>
    </section>
  )
}

export default Dashboard
