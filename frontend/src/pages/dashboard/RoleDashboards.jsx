import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import Button from '../../components/ui/Button.jsx'
import { plural } from '../../utils/format.js'
import { days, percent, shortFcfa } from './dashboardData.js'
import Courbe from './Courbe.jsx'
import { FichesEnCours, KpiCard, KpiRow, Panel, TodoList, YearSelect } from './widgets.jsx'

// Un tableau de bord par profil, réduit à ce que la personne vient y faire : ce qui l'attend,
// quelques chiffres cliquables, et pour le terrain ses fiches en cours. Seules la Direction et
// l'administration ont une courbe : la tendance mois par mois les aide à piloter.
// Le bandeau sombre n'apparaît que lorsqu'il porte une action ; sinon, un simple titre.

const alertTone = (value) => (Number(value ?? 0) > 0 ? 'alert' : 'calm')

function Hero({ eyebrow, title, text, actions }) {
  return (
    <section className="dash-hero">
      <div className="dash-hero__copy">
        <span className="dash-hero__eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        {text && <p>{text}</p>}
        {actions && <div className="dash-hero__actions">{actions}</div>}
      </div>
    </section>
  )
}

function Entete({ title, text }) {
  return (
    <header className="dash-entete">
      <h1>{title}</h1>
      {text && <p>{text}</p>}
    </header>
  )
}

function HeroButton({ to, icon, children, variant = 'primary' }) {
  const navigate = useNavigate()
  return (
    <Button className={`dash-hero__button dash-hero__button--${variant}`} icon={icon} type="button" variant={variant === 'primary' ? 'primary' : 'secondary'} onClick={() => navigate(to)}>
      {children}
    </Button>
  )
}

function usePeutDeclarer() {
  return Boolean(useAuth().activeProfile?.permissions?.includes('DECLARER_FICHE'))
}

export function AgentDashboard({ data, fiches, hello }) {
  const loading = !data
  const peutDeclarer = usePeutDeclarer()
  return (
    <>
      <Hero
        actions={peutDeclarer && <HeroButton icon="plus" to="/fiches/nouvelle">Déclarer une fiche</HeroButton>}
        eyebrow="Espace déclarant"
        text="Signalez un écart terrain et réalisez les actions qui vous sont confiées."
        title={hello}
      />
      <KpiRow>
        <KpiCard icon="ok" label="Mes actions à faire" loading={loading} to="/fiches" tone="info" value={data?.mes_actions_a_faire} />
        <KpiCard icon="clock" label="Mes actions en retard" loading={loading} to="/fiches" tone={alertTone(data?.mes_actions_en_retard)} value={data?.mes_actions_en_retard} />
        <KpiCard icon="file" label="Mes fiches" loading={loading} to="/fiches" tone="brand" value={data?.mes_fiches} />
      </KpiRow>
      <div className="dash-grid">
        <Panel className="dash-span-6" title="À traiter">
          <TodoList data={data} emptyText="Aucune action ne vous attend." />
        </Panel>
        <Panel className="dash-span-6" link={{ to: '/fiches', label: 'Toutes les fiches' }} title="Mes fiches en cours">
          <FichesEnCours fiches={fiches} />
        </Panel>
      </div>
    </>
  )
}

export function PiloteDashboard({ data, fiches, hello }) {
  const loading = !data
  return (
    <>
      <Entete
        text={data ? `${plural(data.mes_fiches, 'fiche', 'fiches')} à piloter, ${plural(data.controles_disponibles, 'contrôle disponible', 'contrôles disponibles')}.` : 'Chargement…'}
        title={hello}
      />
      <KpiRow>
        <KpiCard icon="clock" label="Actions en retard" loading={loading} to="/fiches" tone={alertTone(data?.actions_en_retard)} value={data?.actions_en_retard} />
        <KpiCard icon="ok" label="Contrôles disponibles" loading={loading} to="/fiches" tone="teal" value={data?.controles_disponibles} />
        <KpiCard icon="validation" label="Validations en attente" loading={loading} to="/fiches" tone="violet" value={data?.validations_en_attente_sur_mes_fiches} />
      </KpiRow>
      <div className="dash-grid">
        <Panel className="dash-span-6" title="Mes priorités">
          <TodoList data={data} emptyText="Aucune action en retard ni contrôle en attente." />
        </Panel>
        <Panel className="dash-span-6" link={{ to: '/fiches', label: 'Toutes les fiches' }} subtitle="Ce qu’il reste à faire sur chacune." title="Mes fiches en cours">
          <FichesEnCours fiches={fiches} pilote />
        </Panel>
      </div>
    </>
  )
}

export function ValideurDashboard({ data, hello, roleCode }) {
  const loading = !data
  const autres = (data?.a_traiter ?? []).some((item) => item.type !== 'validation')
  return (
    <>
      <Entete
        text={data
          ? data.validations_a_traiter ? `${plural(data.validations_a_traiter, 'fiche attend', 'fiches attendent')} votre décision.` : 'Aucune demande en attente.'
          : 'Chargement…'}
        title={hello}
      />
      <KpiRow>
        <KpiCard icon="validation" label="Fiches à valider" loading={loading} to="/validations" tone={alertTone(data?.validations_a_traiter)} value={data?.validations_a_traiter} />
        <KpiCard format={days} icon="clock" label="Plus ancienne demande" loading={loading} to="/validations" tone={Number(data?.plus_ancienne_demande_jours ?? 0) > 10 ? 'alert' : 'neutral'} value={data?.plus_ancienne_demande_jours} />
      </KpiRow>
      <div className="dash-grid">
        <Panel className={autres ? 'dash-span-7' : 'dash-span-12'} link={{ to: '/validations', label: 'Toute la file' }} subtitle={roleCode === 'CHEF_DEPARTEMENT' ? 'Pertinence des fiches qui vous sont soumises (porte 0).' : 'Plan d’actions (porte 1) et clôture (porte 2).'} title="File de validation">
          <TodoList data={data} emptyText="Aucune fiche n’attend votre validation." types={['validation']} />
        </Panel>
        {autres && (
          <Panel className="dash-span-5" title="Autres priorités">
            <TodoList data={data} types={['retard', 'controle', 'pilote']} />
          </Panel>
        )}
      </div>
    </>
  )
}

export function ControleDashboard({ data, hello, onAnneeChange }) {
  const loading = !data
  return (
    <>
      <Entete text="Validez les gains déclarés par les pilotes." title={hello} />
      <div className="dash-money">
        <article className="dash-money__main">
          <span className="dash-money__head">Gains annuels validés<YearSelect data={data} onChange={onAnneeChange} /></span>
          <strong>{data ? shortFcfa(data.gains_valides_annee ?? 0) : '—'}</strong>
          <small>Montants annuels validés, par année de validation.</small>
        </article>
        <KpiCard icon="validation" label="Gains à valider" loading={loading} to="/validations" tone={alertTone(data?.gains_a_valider)} value={data?.gains_a_valider} />
        <KpiCard format={days} icon="clock" label="Plus ancienne demande" loading={loading} to="/validations" tone="neutral" value={data?.plus_ancienne_demande_jours} />
      </div>
      <Panel link={{ to: '/validations', label: 'Toute la file' }} title="Validations à traiter">
        <TodoList data={data} emptyText="Aucun gain n’attend votre validation." types={['validation']} />
      </Panel>
    </>
  )
}

export function DirectionDashboard({ data, hello, onAnneeChange }) {
  const loading = !data
  const evolution = data?.evolution ?? []
  return (
    <>
      <Entete text="Ce qui avance, ce qui bloque, ce que ça rapporte." title={hello} />
      <KpiRow>
        <KpiCard icon="file" label="Fiches en cours" loading={loading} to="/fiches" tone="brand" value={data?.fiches_ouvertes} />
        <KpiCard icon="clock" label="Fiches en retard" loading={loading} to="/fiches" tone={alertTone(data?.fiches_en_retard)} value={data?.fiches_en_retard} />
        <KpiCard icon="al" label="Actions en retard" loading={loading} to="/fiches" tone={alertTone(data?.actions_en_retard)} value={data?.actions_en_retard} />
        <KpiCard format={percent} icon="ok" label={`Taux de clôture ${data?.annee ?? ''}`} loading={loading} to="/fiches" tone="calm" value={data?.taux_cloture} />
      </KpiRow>
      <div className="dash-grid">
        <Panel className="dash-span-8" subtitle={`Par mois, en ${data?.annee ?? ''}.`} title="Fiches déclarées et clôturées">
          <Courbe
            data={evolution}
            series={[
              { key: 'declarees', label: 'Déclarées', couleur: 'var(--dash-serie-1)' },
              { key: 'cloturees', label: 'Clôturées', couleur: 'var(--dash-serie-2)' },
            ]}
            titre="Fiches déclarées et clôturées par mois"
          />
        </Panel>
        <article className="dash-span-4 dash-money__main dash-money__main--panel">
          <span className="dash-money__head">Gains annuels validés<YearSelect data={data} onChange={onAnneeChange} /></span>
          <strong>{data ? shortFcfa(data.gains_valides_annee ?? 0) : '—'}</strong>
          <small>{data ? `Validés par le Contrôle de gestion en ${data.annee}` : ''}</small>
        </article>
        <Panel className="dash-span-6" subtitle="Les unités qui ont le plus de fiches en retard." title="Où ça bloque">
          <UnitesTable unites={data?.unites} />
        </Panel>
        <Panel className="dash-span-6" title="À traiter">
          <TodoList data={data} emptyText="Rien n’attend votre décision." />
        </Panel>
      </div>
    </>
  )
}

function UnitesTable({ unites }) {
  if (!unites) return null
  if (unites.length === 0) return <p className="sar-muted">Aucune fiche en cours.</p>
  return (
    <table className="dash-unites">
      <thead><tr><th scope="col">Unité</th><th scope="col">En cours</th><th scope="col">En retard</th></tr></thead>
      <tbody>
        {unites.map((ligne) => (
          <tr key={ligne.unite}>
            <td>{ligne.unite}</td>
            <td>{ligne.ouvertes}</td>
            <td className={ligne.en_retard ? 'dash-unites__retard' : undefined}>{ligne.en_retard}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function AdminDashboard({ data, hello }) {
  const loading = !data
  const admin = data?.administration
  return (
    <>
      <Entete text="Chaque personne doit pouvoir travailler, chaque fiche avoir son pilote." title={hello} />
      <KpiRow>
        <KpiCard hint={admin ? `${admin.connectes_30_jours} connectés ces 30 jours` : undefined} icon="users" label="Comptes actifs" loading={loading} to="/admin/utilisateurs" tone="brand" value={admin?.utilisateurs_actifs} />
        <KpiCard hint="Ils ne peuvent rien faire" icon="assignments" label="Comptes sans rôle" loading={loading} to="/admin/utilisateurs" tone={alertTone(admin?.sans_role)} value={admin?.sans_role} />
        <KpiCard hint="Dans les 30 jours" icon="clock" label="Rôles qui expirent" loading={loading} to="/admin/affectations" tone={Number(admin?.affectations_expirant ?? 0) > 0 ? 'warning' : 'calm'} value={admin?.affectations_expirant} />
        <KpiCard icon="file" label="Fiches sans pilote" loading={loading} to="/fiches" tone={alertTone(data?.fiches_sans_pilote)} value={data?.fiches_sans_pilote} />
      </KpiRow>
      <div className="dash-grid">
        <Panel className="dash-span-7" subtitle={`Utilisation de l’application : fiches déclarées par mois en ${data?.annee ?? ''}.`} title="Fiches déclarées">
          <Courbe
            data={data?.evolution ?? []}
            series={[{ key: 'declarees', label: 'Déclarées', couleur: 'var(--dash-serie-1)' }]}
            titre="Fiches déclarées par mois"
          />
        </Panel>
        <Panel className="dash-span-5" title="À régulariser">
          <TodoList data={data} emptyText="Toutes les fiches ont un pilote et un valideur disponible." types={['reattribution', 'pilote']} />
        </Panel>
      </div>
    </>
  )
}
