import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import EtapeBadge from '../../components/fiche/EtapeBadge.jsx'
import Icon from '../../components/ui/Icon.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import { TODO_TYPES } from './dashboardData.js'

// Briques visuelles du tableau de bord, assemblées différemment selon le profil (RoleDashboards.jsx).

function AnimatedValue({ value, format = String }) {
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

function EmptyNote({ children, icon = 'ok' }) {
  return (
    <div className="dash-empty">
      <span aria-hidden="true"><Icon name={icon} size={18} /></span>
      <p>{children}</p>
    </div>
  )
}

/** Barres horizontales libellé / valeur. */
/** Choix de l'année des indicateurs annuels (consolidation des gains en fin d'année). */
export function YearSelect({ data, onChange }) {
  const annees = data?.annees_disponibles ?? []
  if (annees.length < 2) return data?.annee ? <span className="dash-year">{data.annee}</span> : null
  return (
    <label className="dash-year">
      <span className="sar-sr-only">Année des indicateurs</span>
      <select value={data.annee} onChange={(event) => onChange(Number(event.target.value))}>
        {annees.map((annee) => <option key={annee} value={annee}>{annee}</option>)}
      </select>
    </label>
  )
}

/** Liste « à traiter » : chaque ligne mène à la fiche (8 au plus, renvoyées par le serveur). */
export function TodoList({ data, types, emptyText = 'Tout est à jour : rien ne demande votre attention.' }) {
  const items = (data?.a_traiter ?? []).filter((item) => !types || types.includes(item.type))
  if (!data) return <Skeleton height={140} />
  if (!items.length) return <EmptyNote>{emptyText}</EmptyNote>
  return (
    <ul className="dash-todo__list">
      {items.map((item, index) => {
        const meta = TODO_TYPES[item.type] ?? { label: item.type, icon: 'file', tone: 'neutral' }
        return (
          <li key={`${item.type}-${item.fiche_id}-${item.libelle}-${index}`}>
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
  )
}

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

/** Fiches en cours du profil (pilotées ou déclarées), avec ce qu'il reste à faire pour le pilote. */
export function FichesEnCours({ fiches, pilote }) {
  if (!fiches) return <Skeleton height={140} />
  if (!fiches.length) return <EmptyNote icon="file">Aucune fiche en cours.</EmptyNote>
  return (
    <ul className="dash-todo__list">
      {fiches.map((fiche) => (
        <li key={fiche.id}>
          <Link className="dash-todo__item dash-todo__item--fiche" to={`/fiches/${fiche.id}`}>
            <span className="dash-todo__text">
              <strong>{fiche.titre}</strong>
              <small>{fiche.numero_a3}{pilote && SUITE[fiche.statut_etape] ? ` · ${SUITE[fiche.statut_etape]}` : ''}</small>
            </span>
            <EtapeBadge etape={fiche.statut_etape} />
            <Icon className="dash-todo__chevron" name="page-next" size={16} />
          </Link>
        </li>
      ))}
    </ul>
  )
}

