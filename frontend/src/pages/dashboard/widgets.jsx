import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import { FilterSelect, ListToolbar, SearchField } from '../../components/shared/ListToolbar.jsx'
import { plural } from '../../utils/format.js'
import { downloadExcel, matchesSearch } from '../../utils/listTools.js'
import { TODO_TYPES, actionStatuses, monthLabel, phaseGroups, stageFlow } from './dashboardData.js'

// Briques visuelles du tableau de bord, assemblées différemment selon le profil (RoleDashboards.jsx).

export function AnimatedValue({ value, format = String }) {
  const numericValue = Number(value)
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!Number.isFinite(numericValue) || prefersReducedMotion) return undefined
    let frame
    let startTime
    const animate = (timestamp) => {
      if (startTime === undefined) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / 450, 1)
      setCount(Math.round(numericValue * progress * 10) / 10)
      if (progress < 1) frame = window.requestAnimationFrame(animate)
    }
    frame = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(frame)
  }, [numericValue, prefersReducedMotion])

  return format(Number.isFinite(numericValue) && !prefersReducedMotion ? count : value)
}

/**
 * Carte chiffre cliquable.
 * @param {{ label: string, value: any, format?: Function, icon: string, to: string, tone?: string, hint?: string, loading?: boolean }} props
 */
export function KpiCard({ label, value, format = String, icon, to, tone = 'neutral', hint, loading }) {
  const missing = value === null || value === undefined
  const shown = missing ? '—' : format(value)
  return (
    <Link aria-label={`${label} : ${shown}. Consulter la liste correspondante.`} className={`dash-kpi dash-kpi--${tone}`} to={to}>
      <span aria-hidden="true" className="dash-kpi__icon"><Icon name={icon} size={18} /></span>
      <span className="dash-kpi__label">{label}</span>
      <strong className="dash-kpi__value">{loading ? <Skeleton height={30} width="55%" /> : missing ? '—' : <AnimatedValue format={format} value={value} />}</strong>
      {hint && <span className="dash-kpi__hint">{hint}</span>}
      <Icon className="dash-kpi__arrow" name="arrow" size={16} />
    </Link>
  )
}

export function KpiRow({ children }) {
  return <div className="dash-kpis">{children}</div>
}

export function Panel({ title, subtitle, link, className = '', children }) {
  return (
    <article className={`dash-panel ${className}`}>
      <header className="dash-panel__header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {link && <Link className="dash-panel__link" to={link.to}>{link.label}<Icon name="arrow" size={15} /></Link>}
      </header>
      {children}
    </article>
  )
}

export function EmptyNote({ children, icon = 'ok' }) {
  return (
    <div className="dash-empty">
      <span aria-hidden="true"><Icon name={icon} size={18} /></span>
      <p>{children}</p>
    </div>
  )
}

/** Parcours des fiches : les huit étapes dans l'ordre, la mise en attente à part. */
export function StageFlow({ data }) {
  if (!data) return <Skeleton height={96} />
  const stages = stageFlow(data)
  const flow = stages.filter((stage) => stage.code !== 'EN_ATTENTE')
  const waiting = stages.find((stage) => stage.code === 'EN_ATTENTE')
  const max = Math.max(1, ...flow.map((stage) => stage.count))
  return (
    <div className="dash-flow">
      <ol className="dash-flow__steps">
        {flow.map((stage, index) => (
          <li
            className={['dash-flow__step', stage.count ? 'has-items' : '', stage.validation ? 'is-gate' : '', stage.code === 'CLOTURE' ? 'is-done' : ''].filter(Boolean).join(' ')}
            key={stage.code}
          >
            <span className="dash-flow__bar" style={{ '--fill': stage.count / max }} />
            <span aria-hidden="true" className="dash-flow__dot">{stage.validation ? <Icon name="validation" size={13} /> : index + 1}</span>
            <strong>{stage.count}</strong>
            <span className="dash-flow__label">{stage.label}</span>
          </li>
        ))}
      </ol>
      <p className="dash-flow__aside">
        <Icon name="clock" size={15} />
        {plural(waiting.count, 'fiche')} en attente (blocage signalé)
      </p>
    </div>
  )
}

export function PhaseDonut({ data }) {
  if (!data) return <Skeleton height={180} />
  if (!data.fiches_total) return <EmptyNote icon="file">Aucune fiche visible pour ce profil. Elles apparaîtront ici dès leur déclaration.</EmptyNote>
  const groups = phaseGroups(data).filter((phase) => phase.count > 0)
  const total = groups.reduce((sum, phase) => sum + phase.count, 0)
  const { stops } = groups.reduce(({ stops: acc, position }, phase) => {
    const next = position + phase.count / total * 100
    return { stops: [...acc, `${phase.color} ${position}% ${next}%`], position: next }
  }, { stops: [], position: 0 })
  return (
    <div className="dash-donut">
      <div
        aria-label={`Répartition de ${total} fiches : ${groups.map((phase) => `${phase.label}, ${phase.count}`).join('; ')}`}
        className="dash-donut__ring"
        role="img"
        style={{ '--donut': `conic-gradient(${stops.join(', ')})` }}
      >
        <span aria-hidden="true"><strong>{total}</strong><small>fiches</small></span>
      </div>
      <ul className="dash-donut__legend">
        {groups.map((phase) => (
          <li key={phase.code}>
            <i style={{ '--swatch': phase.color }} />
            <span>{phase.label}</span>
            <strong>{phase.count}</strong>
            <small>{Math.round(phase.count / total * 100)} %</small>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function MonthlyBars({ data }) {
  if (!data) return <Skeleton height={160} />
  const months = data.fiches_creees_par_mois ?? []
  const max = Math.max(1, ...months.map((month) => Number(month.total)))
  const last = months.length ? Number(months[months.length - 1].total) : 0
  return (
    <div aria-label="Nombre de fiches déclarées chaque mois" className="dash-months" role="img">
      {months.map((month, index) => {
        const count = Number(month.total)
        return (
          <div className={`dash-months__col${index === months.length - 1 ? ' is-current' : ''}`} key={month.mois} title={`${monthLabel(month.mois)} : ${plural(count, 'fiche')}`}>
            <strong>{count}</strong>
            <span className="dash-months__track"><i style={{ '--fill': count / max }} /></span>
            <span>{monthLabel(month.mois)}</span>
          </div>
        )
      })}
      <span className="sar-sr-only">{plural(last, 'fiche')} ce mois-ci.</span>
    </div>
  )
}

/** Barres horizontales libellé / valeur. */
export function BarList({ items, unit = 'élément' }) {
  const max = Math.max(1, ...items.map((item) => item.count))
  return (
    <ul className="dash-bars">
      {items.map((item) => (
        <li key={item.code}>
          <span className="dash-bars__label">{item.label}</span>
          <span aria-label={plural(item.count, unit)} className="dash-bars__track" role="img">
            <i style={{ '--fill': item.count / max, '--swatch': item.color }} />
          </span>
          <strong>{item.count}</strong>
        </li>
      ))}
    </ul>
  )
}

export function ActionStatusBars({ data }) {
  if (!data) return <Skeleton height={120} />
  const statuses = actionStatuses(data).filter((status) => status.count > 0)
  if (!statuses.length) return <EmptyNote>Aucune action enregistrée sur les fiches visibles.</EmptyNote>
  return <BarList items={statuses} unit="action" />
}

/** Anneau de progression (0 à 100). */
export function Ring({ value, label, caption, tone = 'brand', size = 132 }) {
  const ratio = Math.max(0, Math.min(Number(value) || 0, 100)) / 100
  const radius = 52
  const circumference = 2 * Math.PI * radius
  return (
    <figure className={`dash-ring dash-ring--${tone}`}>
      <svg aria-hidden="true" height={size} viewBox="0 0 120 120" width={size}>
        <circle className="dash-ring__track" cx="60" cy="60" r={radius} />
        {ratio > 0 && <circle className="dash-ring__value" cx="60" cy="60" r={radius} strokeDasharray={`${circumference * ratio} ${circumference}`} transform="rotate(-90 60 60)" />}
      </svg>
      <span className="dash-ring__center"><strong>{label}</strong>{caption && <small>{caption}</small>}</span>
    </figure>
  )
}

/** Liste « à traiter » avec recherche, filtre par type et export, éventuellement limitée à certains types. */
export function TodoList({ data, types, emptyText = 'Tout est à jour : rien ne demande votre attention.', exportName = 'tableau-de-bord-a-traiter.xlsx' }) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const items = useMemo(() => (data?.a_traiter ?? []).filter((item) => !types || types.includes(item.type)), [data, types])
  const filtered = useMemo(() => items.filter((item) => (
    matchesSearch([item.numero_a3, item.libelle, item.delai, TODO_TYPES[item.type]?.label], query)
    && (!type || item.type === type)
  )), [items, query, type])
  const presentTypes = [...new Set(items.map((item) => item.type))]

  if (!data) return <Skeleton height={140} />
  if (!items.length) return <EmptyNote>{emptyText}</EmptyNote>

  return (
    <div className="dash-todo">
      {items.length > 3 && (
        <ListToolbar className="dash-todo__tools" plain>
          <SearchField placeholder="N° de fiche ou tâche…" value={query} onChange={setQuery} />
          {presentTypes.length > 1 && (
            <FilterSelect allLabel="Tous" label="Type" options={presentTypes.map((code) => [code, TODO_TYPES[code]?.label ?? code])} value={type} onChange={setType} />
          )}
          <Button disabled={!filtered.length} icon="download" type="button" variant="ghost" onClick={() => downloadExcel(exportName, [
            { label: 'N° A3', value: (item) => item.numero_a3 },
            { label: 'À traiter', value: (item) => item.libelle },
            { label: 'Délai', value: (item) => item.delai },
            { label: 'Type', value: (item) => TODO_TYPES[item.type]?.label ?? item.type },
          ], filtered)}>Exporter</Button>
        </ListToolbar>
      )}
      {filtered.length === 0 && <p className="sar-muted">Aucun élément ne correspond à la recherche.</p>}
      <ul className="dash-todo__list">
        {filtered.map((item) => {
          const meta = TODO_TYPES[item.type] ?? { label: item.type, icon: 'file', tone: 'neutral' }
          return (
            <li key={`${item.type}-${item.fiche_id}-${item.libelle}`}>
              <Link className={`dash-todo__item dash-todo__item--${meta.tone}`} to={`/fiches/${item.fiche_id}`}>
                <span aria-hidden="true" className="dash-todo__icon"><Icon name={meta.icon} size={17} /></span>
                <span className="dash-todo__text">
                  <strong>{item.libelle}</strong>
                  <small>{item.numero_a3} · {meta.label}</small>
                </span>
                <span className="dash-todo__delay"><Icon name="clock" size={13} />{item.delai}</span>
                <Icon className="dash-todo__chevron" name="page-next" size={16} />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function TodoTypeSummary({ data }) {
  const items = data?.a_traiter ?? []
  const counts = Object.entries(TODO_TYPES)
    .map(([code, meta]) => ({ code, label: meta.plural, color: `var(--dash-tone-${meta.tone})`, count: items.filter((item) => item.type === code).length }))
    .filter((item) => item.count > 0)
  if (!data) return <Skeleton height={100} />
  if (!counts.length) return <EmptyNote>Aucune priorité en cours.</EmptyNote>
  return <BarList items={counts} />
}

/** Raccourcis vers des pages déjà accessibles au profil (mêmes routes que le menu). */
export function Shortcuts({ items }) {
  return (
    <ul className="dash-shortcuts">
      {items.map((item) => (
        <li key={item.to}>
          <Link className="dash-shortcuts__item" to={item.to}>
            <span aria-hidden="true" className="dash-shortcuts__icon"><Icon name={item.icon} size={20} /></span>
            <strong>{item.label}</strong>
            <small>{item.description}</small>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function Steps({ items }) {
  return (
    <ol className="dash-steps">
      {items.map((item, index) => (
        <li key={item.title}>
          <span aria-hidden="true">{index + 1}</span>
          <div><strong>{item.title}</strong><small>{item.text}</small></div>
        </li>
      ))}
    </ol>
  )
}
