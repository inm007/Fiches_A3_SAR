import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRequest } from '../../auth/api.js'
import { useAuth } from '../../auth/useAuth.js'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import { FilterSelect, ListToolbar, SearchField } from '../../components/shared/ListToolbar.jsx'
import { ETAPES } from '../../utils/constants.js'
import { formatFcfa, plural } from '../../utils/format.js'
import { downloadExcel, matchesSearch } from '../../utils/listTools.js'
import './Dashboard.css'

const TODO_TYPES = { validation: 'Validation', retard: 'Action en retard', controle: 'Contrôle', pilote: 'Désignation pilote' }

const percent = (value) => (value === null || value === undefined ? '—' : `${String(value).replace('.', ',')} %`)
const days = (value) => (value === null || value === undefined ? '—' : `${value} j`)
const shortFcfa = (value) => (Math.abs(value) >= 1_000_000 ? `${(value / 1_000_000).toFixed(1).replace('.', ',')} M FCFA` : formatFcfa(value))

// Cartes de chiffres par profil (UX §6) : [libellé, clé, icône, format].
const kpis = {
  AGENT: [['Mes fiches', 'mes_fiches', 'file'], ['Mes actions à faire', 'mes_actions_a_faire', 'ok'], ['Mes actions en retard', 'mes_actions_en_retard', 'clock'], ['Fiches en attente', 'par_etape.EN_ATTENTE', 'al']],
  PILOTE: [['Mes fiches', 'mes_fiches', 'file'], ['Actions en retard (fiches visibles)', 'actions_en_retard', 'clock'], ['Validations en attente', 'validations_en_attente_sur_mes_fiches', 'ok'], ['Contrôles disponibles', 'controles_disponibles', 'al']],
  VALIDEUR: [['Fiches à valider', 'validations_a_traiter', 'ok'], ['Décisions récentes (30 j)', 'decisions_recentes', 'file'], ['Plus ancienne demande', 'plus_ancienne_demande_jours', 'clock', days], ['Fiches de mon périmètre', 'fiches_total', 'users']],
  CONTROLE_GESTION: [['Gains à valider', 'gains_a_valider', 'ok'], ['Gains validés de l’année', 'gains_valides_annee', 'file', shortFcfa], ['Gain net annuel validé', 'gain_net_annuel_valide', 'users', shortFcfa], ['Validations à traiter', 'validations_a_traiter', 'clock']],
  DIRECTION: [['Fiches ouvertes', 'fiches_ouvertes', 'file'], ['Taux de clôture', 'taux_cloture', 'ok', percent], ['Délai moyen de clôture', 'delai_moyen_cloture_jours', 'clock', days], ['Gain net annuel validé', 'gain_net_annuel_valide', 'users', shortFcfa]],
  ADMIN_FONCTIONNEL: [['Fiches sans pilote', 'fiches_sans_pilote', 'al'], ['Affectations actives', 'affectations_actives', 'users'], ['Fiches ouvertes', 'fiches_ouvertes', 'file'], ['Actions en retard (fiches visibles)', 'actions_en_retard', 'clock']],
}

const typeIcons = { validation: 'ok', retard: 'al', controle: 'clock', pilote: 'users' }
const stagePhases = [
  { code: 'ouverture', label: 'Ouverture', color: 'var(--chart-phase-opening)', stages: ['OUVERT'] },
  { code: 'plan', label: 'Planification', color: 'var(--chart-phase-planning)', stages: ['EN_COURS', 'EN_VALIDATION_PLAN'] },
  { code: 'realisation', label: 'Réalisation', color: 'var(--chart-phase-realization)', stages: ['REALISATION_ACTIONS'] },
  { code: 'verification', label: 'Vérification', color: 'var(--chart-phase-verification)', stages: ['MESURE_RESULTATS', 'VERIFICATION_MAINTIEN', 'EN_VALIDATION_CLOTURE'] },
  { code: 'cloture', label: 'Clôture', color: 'var(--chart-phase-closure)', stages: ['CLOTURE'] },
  { code: 'attente', label: 'En attente', color: 'var(--chart-phase-waiting)', stages: ['EN_ATTENTE'] },
]
const todoTypeLabels = {
  validation: 'Validations',
  retard: 'Actions en retard',
  controle: 'Contrôles',
  pilote: 'Pilotes à désigner',
}
const todoTypeColors = {
  validation: '#7D6BAB',
  retard: '#C76B64',
  controle: '#4B91A0',
  pilote: '#568A70',
}
const actionStatusLabels = {
  A_FAIRE: 'À faire',
  EN_COURS: 'En cours',
  REALISE: 'Réalisées',
  ANNULE: 'Annulées',
  BLOQUE: 'Bloquées',
}
const actionStatusColors = {
  A_FAIRE: 'var(--chart-phase-opening)',
  EN_COURS: 'var(--chart-phase-realization)',
  REALISE: 'var(--chart-phase-closure)',
  ANNULE: 'var(--chart-phase-waiting)',
  BLOQUE: '#C76B64',
}
const kpiDestinations = {
  mes_fiches: '/fiches',
  mes_actions_a_faire: '/fiches',
  mes_actions_en_retard: '/fiches',
  'par_etape.EN_ATTENTE': '/fiches',
  actions_en_retard: '/fiches',
  validations_a_traiter: '/validations',
  decisions_recentes: '/validations',
  plus_ancienne_demande_jours: '/validations',
  validations_en_attente_sur_mes_fiches: '/fiches',
  controles_disponibles: '/fiches',
  gains_a_valider: '/fiches',
  gains_valides_annee: '/fiches',
  gain_net_annuel_valide: '/fiches',
  taux_cloture: '/fiches',
  delai_moyen_cloture_jours: '/fiches',
  fiches_total: '/fiches',
  fiches_ouvertes: '/fiches',
  fiches_sans_pilote: '/fiches',
  affectations_actives: '/admin/affectations',
}

function monthLabel(month) {
  return new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' })
    .format(new Date(`${month}-01T00:00:00Z`))
    .replace('.', '')
}

function valueOf(data, path) {
  return path.split('.').reduce((current, key) => current?.[key], data)
}

function AnimatedValue({ value, format = String }) {
  const numericValue = Number(value)
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!Number.isFinite(numericValue) || prefersReducedMotion) return undefined

    let frame
    let startTime
    const duration = 450

    const animate = (timestamp) => {
      if (startTime === undefined) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCount(Math.round(numericValue * progress * 10) / 10)
      if (progress < 1) frame = window.requestAnimationFrame(animate)
    }

    frame = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(frame)
  }, [numericValue, prefersReducedMotion])

  return format(Number.isFinite(numericValue) && !prefersReducedMotion ? count : value)
}

function Dashboard() {
  const { activeProfile } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [todoQuery, setTodoQuery] = useState('')
  const [todoType, setTodoType] = useState('')
  const roleCode = activeProfile?.role_code
  const cards = kpis[roleCode] ?? (roleCode?.startsWith('VALIDEUR_') ? kpis.VALIDEUR : kpis.AGENT)
  const canDeclare = ['AGENT', 'PILOTE'].includes(roleCode)

  useEffect(() => {
    apiRequest('/tableau-de-bord').then((result) => setData(result.data)).catch((loadError) => setError(loadError.message))
  }, [roleCode])

  const stages = Object.entries(ETAPES)
    .map(([code, stage]) => ({ code, ...stage, count: Number(data?.par_etape?.[code] ?? 0) }))
  const stageGroups = stagePhases.map((phase) => ({
    ...phase,
    count: stages.filter((stage) => phase.stages.includes(stage.code)).reduce((total, stage) => total + stage.count, 0),
  })).filter((phase) => phase.count > 0)
  const phaseTotal = stageGroups.reduce((total, phase) => total + phase.count, 0)
  const { stops: phaseStops } = stageGroups.reduce(({ stops, position }, phase) => {
    const nextPosition = position + (phaseTotal ? phase.count / phaseTotal * 100 : 0)
    return {
      stops: [...stops, `${phase.color} ${position}% ${nextPosition}%`],
      position: nextPosition,
    }
  }, { stops: [], position: 0 })
  const phaseGradient = phaseStops.join(', ')
  const aTraiter = useMemo(() => data?.a_traiter ?? [], [data])
  const retards = aTraiter.filter((item) => item.type === 'retard').length
  const compactPriorities = Boolean(data && retards === 0 && data.validations_a_traiter === 0)
  const todoBreakdown = Object.entries(todoTypeLabels)
    .map(([type, label]) => ({
      type,
      label,
      color: todoTypeColors[type],
      count: aTraiter.filter((item) => item.type === type).length,
    }))
    .filter((item) => item.count > 0)
  const maxTodoTypeCount = Math.max(1, ...todoBreakdown.map((item) => item.count))
  const actionStatuses = Object.entries(actionStatusLabels).map(([code, label]) => ({
    code,
    label,
    color: actionStatusColors[code],
    count: Number(data?.actions_par_statut?.[code] ?? 0),
  }))
  const maxActionCount = Math.max(1, ...actionStatuses.map((item) => item.count))
  const monthlyFiches = data?.fiches_creees_par_mois ?? []
  const maxMonthlyFiches = Math.max(1, ...monthlyFiches.map((month) => Number(month.total)))
  const filteredTodos = useMemo(() => aTraiter.filter((item) => (
    matchesSearch([item.numero_a3, item.libelle, item.delai, item.type], todoQuery)
    && (!todoType || item.type === todoType)
  )), [aTraiter, todoQuery, todoType])

  return (
    <section className="dashboard-page">
      {error && <Alert severity="error">{error}</Alert>}

      <div className={`dashboard-page__hero${compactPriorities ? ' dashboard-page__hero--compact' : ''}`}>
        <div>
          <div className="dashboard-page__eyebrow">Vos priorités du jour</div>
          <h2>{compactPriorities ? 'Aucun retard ni validation en attente' : `${plural(aTraiter.length, 'élément')} ${aTraiter.length > 1 ? 'attendent' : 'attend'} votre action`}</h2>
          <div className="dashboard-page__hero-text">
            {data ? `${plural(retards, 'action')} en retard dans les priorités affichées · ${plural(data.validations_a_traiter, 'validation')} à traiter` : 'Chargement des indicateurs…'}
          </div>
        </div>
        <div className="dashboard-page__hero-actions">
          {canDeclare && <Button icon="plus" type="button" onClick={() => navigate('/fiches/nouvelle')}>Nouvelle fiche</Button>}
          <Button type="button" variant="secondary" onClick={() => navigate('/fiches')}>Voir les fiches <Icon name="arrow" /></Button>
        </div>
      </div>

      <div className="dashboard-page__kpis">
        {cards.map(([label, key, icon, format], index) => (
          <Link
            aria-label={`${label} : ${format ? format(valueOf(data, key) ?? 0) : valueOf(data, key) ?? 0}. Consulter la liste correspondante.`}
            className={`sar-card dashboard-page__kpi${['actions_en_retard', 'mes_actions_en_retard', 'fiches_sans_pilote'].includes(key) ? Number(valueOf(data, key) ?? 0) > 0 ? ' dashboard-page__kpi--alert' : ' dashboard-page__kpi--neutral' : ''}`}
            key={key}
            style={{ animationDelay: `${index * 80}ms` }}
            to={kpiDestinations[key] ?? '/fiches'}
          >
            <div className="dashboard-page__kpi-label"><span className={`dashboard-page__kpi-tile dashboard-page__kpi-tile--${index}`}><Icon name={icon} /></span>{label}</div>
            <div className="dashboard-page__kpi-value">{data ? <AnimatedValue format={format} value={valueOf(data, key) ?? 0} /> : <Skeleton height={28} width="50%" />}</div>
            <span aria-hidden="true" className="dashboard-page__kpi-hint"><Icon name="arrow" size={15} /></span>
          </Link>
        ))}
      </div>

      <div className="dashboard-page__grid">
        <article className="sar-card dashboard-page__stages">
          <h2>Répartition des fiches par phase</h2>
          {!data && <Skeleton />}
          {data && data.fiches_total === 0 && <p className="sar-muted">Aucune fiche visible pour ce profil. Les fiches apparaîtront ici dès leur déclaration.</p>}
          {data && data.fiches_total > 0 && (
            <div className="dashboard-page__phase-chart">
              <div
                aria-label={`Répartition de ${data.fiches_total} fiches : ${stageGroups.map((phase) => `${phase.label}, ${phase.count} (${Math.round(phase.count / data.fiches_total * 100)} pour cent)`).join('; ')}`}
                className="dashboard-page__phase-donut"
                role="img"
                style={{ background: phaseGradient ? `conic-gradient(${phaseGradient})` : 'var(--gray-100)' }}
              >
                <span aria-hidden="true" className="dashboard-page__phase-donut-center">
                  <strong>{data.fiches_total}</strong>
                  <small>fiches</small>
                </span>
              </div>
              <ul className="dashboard-page__phase-legend">
                {stageGroups.map((phase) => (
                  <li key={phase.code}>
                    <span className="dashboard-page__phase-name" title={phase.code === 'attente' ? 'En attente — état transversal' : phase.label}>
                      <i style={{ backgroundColor: phase.color }} />
                      {phase.label}
                    </span>
                    <strong>{phase.count}</strong>
                    <span>{Math.round(phase.count / data.fiches_total * 100)} %</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>
        <article className="sar-card dashboard-page__monthly">
          <h2>Fiches déclarées sur les 6 derniers mois</h2>
          <p className="sar-muted dashboard-page__chart-caption">Évolution mensuelle des fiches visibles par votre profil.</p>
          {!data && <Skeleton />}
          {data && (
            <div aria-label="Nombre de fiches déclarées chaque mois" className="dashboard-page__monthly-chart" role="img">
              {monthlyFiches.map((month) => {
                const count = Number(month.total)
                const height = count > 0 ? Math.max(count / maxMonthlyFiches * 100, 8) : 0

                return (
                  <div className="dashboard-page__monthly-column" key={month.mois} title={`${monthLabel(month.mois)} : ${plural(count, 'fiche')}`}>
                    <strong>{count}</strong>
                    <span className="dashboard-page__monthly-track"><i style={{ height: `${height}%` }} /></span>
                    <span>{monthLabel(month.mois)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </article>
        <article className="sar-card dashboard-page__action-status">
          <h2>Actions par statut</h2>
          <p className="sar-muted dashboard-page__chart-caption">Toutes les actions des fiches visibles, y compris les actions terminées.</p>
          {!data && <Skeleton />}
          {data && actionStatuses.every((item) => item.count === 0) && <p className="sar-muted">Aucune action enregistrée sur les fiches visibles.</p>}
          {data && actionStatuses.some((item) => item.count > 0) && (
            <ul className="dashboard-page__action-chart">
              {actionStatuses.filter((item) => item.count > 0).map((item) => (
                <li key={item.code}>
                  <span className="dashboard-page__todo-chart-label">{item.label}</span>
                  <span aria-label={plural(item.count, 'action')} className="dashboard-page__todo-chart-track" role="img">
                    <i style={{ width: `${item.count / maxActionCount * 100}%`, background: item.color }} />
                  </span>
                  <strong>{item.count}</strong>
                </li>
              ))}
            </ul>
          )}
        </article>
        <article className={`sar-card dashboard-page__todo-breakdown${data && todoBreakdown.length === 0 ? ' dashboard-page__todo-breakdown--empty' : ''}`}>
          <h2>Priorités par type</h2>
          {todoBreakdown.length > 0 && <p className="sar-muted dashboard-page__chart-caption">Répartition des {aTraiter.length} priorités affichées.</p>}
          {!data && <Skeleton />}
          {data && todoBreakdown.length === 0 && (
            <div className="dashboard-page__empty">
              <span><Icon name="ok" size={18} /></span>
              <p>Aucune priorité urgente à répartir. Votre suivi est à jour.</p>
            </div>
          )}
          {todoBreakdown.length > 0 && (
            <ul className="dashboard-page__todo-chart">
              {todoBreakdown.map((item) => (
                <li key={item.type}>
                  <span className="dashboard-page__todo-chart-label">{item.label}</span>
                  <span
                    aria-label={`${item.count} sur ${aTraiter.length}`}
                    className="dashboard-page__todo-chart-track"
                    role="img"
                  >
                    <i style={{ width: `${item.count / maxTodoTypeCount * 100}%`, background: item.color }} />
                  </span>
                  <strong>{item.count}</strong>
                </li>
              ))}
            </ul>
          )}
        </article>
        <article className={`sar-card dashboard-page__todo-list${data && aTraiter.length === 0 ? ' dashboard-page__todo-list--empty' : ''}`}>
          <h2>À traiter</h2>
          {data && aTraiter.length === 0 && (
            <div className="dashboard-page__empty">
              <span><Icon name="ok" size={18} /></span>
              <p>Tout est à jour : aucune action ne demande votre attention.</p>
            </div>
          )}
          {aTraiter.length > 0 && (
            <ListToolbar className="dashboard-page__todo-tools" plain>
              <SearchField placeholder="N° de fiche ou tâche…" value={todoQuery} onChange={setTodoQuery} />
              <FilterSelect
                allLabel="Tous"
                label="Type"
                options={[...new Set(aTraiter.map((item) => item.type))].map((type) => [type, TODO_TYPES[type] ?? type])}
                value={todoType}
                onChange={setTodoType}
              />
              <Button disabled={!filteredTodos.length} icon="download" type="button" variant="secondary" onClick={() => downloadExcel('tableau-de-bord-a-traiter.xlsx', [
                { label: 'N° A3', value: (item) => item.numero_a3 },
                { label: 'À traiter', value: (item) => item.libelle },
                { label: 'Délai', value: (item) => item.delai },
                { label: 'Type', value: (item) => item.type },
              ], filteredTodos)}>Exporter Excel</Button>
            </ListToolbar>
          )}
          {data && filteredTodos.length === 0 && aTraiter.length > 0 && <p className="sar-muted">Aucun élément ne correspond à la recherche.</p>}
          {filteredTodos.map((item) => (
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
