import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import Button from '../../components/ui/Button.jsx'
import { plural } from '../../utils/format.js'
import { ageTone, days, percent, shortFcfa } from './dashboardData.js'
import {
  ActionStatusBars, KpiCard, KpiRow, MonthlyBars, Panel, PhaseDonut, RepartitionBars, Ring, Shortcuts, StageFlow, Steps, TodoList, TodoTypeSummary, YearSelect,
} from './widgets.jsx'

// Un tableau de bord par profil. Les liens et boutons ne mènent qu'aux pages déjà ouvertes
// à ce profil par le menu et les routes (RequireRole) ; les données viennent toutes de /tableau-de-bord.

const alertTone = (value) => (Number(value ?? 0) > 0 ? 'alert' : 'calm')

/** Chiffres du bandeau, complémentaires des cartes : ouvertes, clôturées, déclarées ce mois-ci. */
function overview(data) {
  const months = data?.fiches_creees_par_mois ?? []
  return [
    { label: 'Fiches ouvertes', value: data?.fiches_ouvertes ?? '—' },
    { label: 'Clôturées', value: data ? Number(data.par_etape?.CLOTURE ?? 0) : '—' },
    { label: 'Déclarées ce mois', value: data ? Number(months[months.length - 1]?.total ?? 0) : '—' },
  ]
}

function Hero({ eyebrow, title, text, actions, highlights = [] }) {
  return (
    <section className="dash-hero">
      <div className="dash-hero__copy">
        <span className="dash-hero__eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        {text && <p>{text}</p>}
        {actions && <div className="dash-hero__actions">{actions}</div>}
      </div>
      {highlights.length > 0 && (
        <dl className="dash-hero__highlights">
          {highlights.map((item) => (
            <div className={item.tone ? `is-${item.tone}` : undefined} key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
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

const DECLARE_STEPS = [
  { title: 'Décrire le problème', text: 'Titre, unité, origine et énoncé des faits.' },
  { title: 'Un pilote est désigné', text: 'Il complète l’analyse et le plan d’actions.' },
  { title: 'Suivre l’avancement', text: 'Vous êtes notifié à chaque étape franchie.' },
]

function usePeutDeclarer() {
  return Boolean(useAuth().activeProfile?.permissions?.includes('DECLARER_FICHE'))
}

export function AgentDashboard({ data, hello }) {
  const loading = !data
  const peutDeclarer = usePeutDeclarer()
  return (
    <>
      <Hero
        actions={<>{peutDeclarer && <HeroButton icon="plus" to="/fiches/nouvelle">Déclarer une fiche</HeroButton>}<HeroButton to="/fiches" variant={peutDeclarer ? 'ghost' : undefined}>Mes fiches</HeroButton></>}
        eyebrow="Espace déclarant"
        highlights={overview(data)}
        text="Signalez un écart terrain en quelques secondes et suivez ce que deviennent vos fiches."
        title={hello}
      />
      <KpiRow>
        <KpiCard icon="file" label="Mes fiches" loading={loading} to="/fiches" tone="brand" value={data?.mes_fiches} />
        <KpiCard icon="ok" label="Mes actions à faire" loading={loading} to="/fiches" tone="info" value={data?.mes_actions_a_faire} />
        <KpiCard icon="clock" label="Mes actions en retard" loading={loading} to="/fiches" tone={alertTone(data?.mes_actions_en_retard)} value={data?.mes_actions_en_retard} />
        <KpiCard icon="al" label="Fiches en attente" loading={loading} to="/fiches" tone="neutral" value={data?.par_etape?.EN_ATTENTE} />
      </KpiRow>
      <div className="dash-grid">
        <Panel className="dash-span-12" subtitle="Où en sont les fiches que vous pouvez consulter, étape par étape." title="Parcours de mes fiches">
          <StageFlow data={data} />
        </Panel>
        <Panel className="dash-span-7" link={{ to: '/fiches', label: 'Toutes mes fiches' }} title="À traiter">
          <TodoList data={data} emptyText="Aucune action ne vous attend. Merci pour votre vigilance terrain !" />
        </Panel>
        <Panel className="dash-span-5 dash-panel--accent" title="Déclarer, c’est simple">
          <Steps items={DECLARE_STEPS} />
          {peutDeclarer && <HeroButton icon="plus" to="/fiches/nouvelle">Nouvelle fiche</HeroButton>}
        </Panel>
        <Panel className="dash-span-6" subtitle="Toutes les actions des fiches visibles." title="Actions par statut">
          <ActionStatusBars data={data} />
        </Panel>
        <Panel className="dash-span-6" subtitle="Fiches déclarées visibles par votre profil." title="Les 6 derniers mois">
          <MonthlyBars data={data} />
        </Panel>
      </div>
    </>
  )
}

export function PiloteDashboard({ data, hello }) {
  const loading = !data
  const peutDeclarer = usePeutDeclarer()
  const actions = data?.actions_par_statut ?? {}
  const totalActions = Object.values(actions).reduce((sum, count) => sum + Number(count), 0)
  const done = Number(actions.REALISE ?? 0)
  return (
    <>
      <Hero
        actions={<><HeroButton icon="files" to="/fiches">Piloter mes fiches</HeroButton>{peutDeclarer && <HeroButton icon="plus" to="/fiches/nouvelle" variant="ghost">Nouvelle fiche</HeroButton>}</>}
        eyebrow="Pilotage"
        highlights={overview(data)}
        text={data ? `${plural(data.fiches_ouvertes, 'fiche ouverte', 'fiches ouvertes')} dans votre périmètre, ${plural(data.controles_disponibles, 'contrôle disponible', 'contrôles disponibles')}.` : 'Chargement de vos indicateurs…'}
        title={hello}
      />
      <KpiRow>
        <KpiCard icon="file" label="Mes fiches" loading={loading} to="/fiches" tone="brand" value={data?.mes_fiches} />
        <KpiCard icon="clock" label="Actions en retard" loading={loading} to="/fiches" tone={alertTone(data?.actions_en_retard)} value={data?.actions_en_retard} />
        <KpiCard icon="validation" label="Validations en attente" loading={loading} to="/fiches" tone="violet" value={data?.validations_en_attente_sur_mes_fiches} />
        <KpiCard icon="ok" label="Contrôles disponibles" loading={loading} to="/fiches" tone="teal" value={data?.controles_disponibles} />
      </KpiRow>
      <div className="dash-grid">
        <Panel className="dash-span-12" subtitle="Les deux portes de validation sont signalées par une coche." title="Avancement de mes fiches">
          <StageFlow data={data} />
        </Panel>
        <Panel className="dash-span-7" link={{ to: '/fiches', label: 'Voir les fiches' }} title="Mes priorités">
          <TodoList data={data} emptyText="Aucune action en retard ni contrôle en attente : vos fiches avancent." />
        </Panel>
        <Panel className="dash-span-5" title="Réalisation du plan d’actions">
          <div className="dash-split">
            <Ring caption="réalisées" label={totalActions ? percent(done / totalActions * 100) : '—'} tone="success" value={totalActions ? done / totalActions * 100 : 0} />
            <ActionStatusBars data={data} />
          </div>
        </Panel>
        <Panel className="dash-span-6" title="Répartition par phase">
          <PhaseDonut data={data} />
        </Panel>
        <Panel className="dash-span-6" subtitle="Fiches déclarées visibles par votre profil." title="Les 6 derniers mois">
          <MonthlyBars data={data} />
        </Panel>
      </div>
    </>
  )
}

export function ValideurDashboard({ data, hello, roleCode, roleLabel }) {
  const loading = !data
  const age = data?.plus_ancienne_demande_jours
  const tone = ageTone(age)
  return (
    <>
      <Hero
        actions={<HeroButton icon="validation" to="/validations">Ouvrir ma file de validation</HeroButton>}
        eyebrow={roleLabel || 'Validation'}
        highlights={[
          { label: 'En validation', value: data ? Number(data.par_etape?.EN_VALIDATION_PERTINENCE ?? 0) + Number(data.par_etape?.EN_VALIDATION_PLAN ?? 0) + Number(data.par_etape?.EN_VALIDATION_CLOTURE ?? 0) : '—' },
          ...overview(data).slice(1),
        ]}
        text={data
          ? data.validations_a_traiter ? `${plural(data.validations_a_traiter, 'fiche attend', 'fiches attendent')} votre décision.` : 'Aucune demande en attente : votre file est vide.'
          : 'Chargement de votre file…'}
        title={hello}
      />
      <KpiRow>
        <KpiCard icon="validation" label="Fiches à valider" loading={loading} to="/validations" tone={alertTone(data?.validations_a_traiter)} value={data?.validations_a_traiter} />
        <KpiCard icon="file" label="Décisions récentes (30 j)" loading={loading} to="/validations" tone="info" value={data?.decisions_recentes} />
        <KpiCard format={days} icon="clock" label="Plus ancienne demande" loading={loading} to="/validations" tone={tone === 'danger' ? 'alert' : 'neutral'} value={age} />
        <KpiCard icon="users" label="Fiches de mon périmètre" loading={loading} to="/fiches" tone="brand" value={data?.fiches_total} />
      </KpiRow>
      <div className="dash-grid">
        <Panel className="dash-span-8" link={{ to: '/validations', label: 'Toute la file' }} subtitle={roleCode === 'CHEF_DEPARTEMENT' ? 'Pertinence des fiches qui vous sont soumises (porte 0).' : 'Plan d’actions (porte 1) et clôture (porte 2).'} title="File de validation">
          <TodoList data={data} emptyText="Aucune fiche n’attend votre validation." exportName="validations-a-traiter.xlsx" types={['validation']} />
        </Panel>
        <Panel className="dash-span-4" subtitle="Vert jusqu’à 5 jours, orange jusqu’à 10, rouge au-delà." title="Délai de traitement">
          <Ring caption={age === null || age === undefined ? 'aucune demande' : 'plus ancienne demande'} label={days(age)} tone={tone} value={age === null || age === undefined ? 0 : Math.min(age / 15 * 100, 100)} />
        </Panel>
        <Panel className="dash-span-12" subtitle="Fiches de votre périmètre, étape par étape." title="Parcours du périmètre">
          <StageFlow data={data} />
        </Panel>
        <Panel className="dash-span-6" title="Répartition par phase">
          <PhaseDonut data={data} />
        </Panel>
        <Panel className="dash-span-6" title="Autres priorités">
          <TodoList data={data} emptyText="Rien d’autre ne vous attend." types={['retard', 'controle', 'pilote']} />
        </Panel>
      </div>
    </>
  )
}

export function ControleDashboard({ data, hello, onAnneeChange }) {
  const loading = !data
  return (
    <>
      <Hero
        actions={<><HeroButton icon="validation" to="/validations">Gains à valider</HeroButton><HeroButton to="/fiches" variant="ghost">Voir les fiches</HeroButton></>}
        eyebrow="Contrôle de gestion"
        highlights={overview(data)}
        text="Validez les gains déclarés et suivez la valeur créée par l’amélioration continue."
        title={hello}
      />
      <div className="dash-money">
        <article className="dash-money__main">
          <span className="dash-money__head">Gains annuels validés<YearSelect data={data} onChange={onAnneeChange} /></span>
          <strong>{data ? shortFcfa(data.gains_valides_annee ?? 0) : '—'}</strong>
          <small>Somme des montants annuels saisis par les pilotes et validés par le Contrôle de gestion, par année de validation.</small>
        </article>
        <KpiCard icon="validation" label="Gains à valider" loading={loading} to="/validations" tone={alertTone(data?.gains_a_valider)} value={data?.gains_a_valider} />
        <KpiCard format={days} icon="clock" label="Plus ancienne demande" loading={loading} to="/validations" tone="neutral" value={data?.plus_ancienne_demande_jours} />
      </div>
      <div className="dash-grid">
        <Panel className="dash-span-7" link={{ to: '/validations', label: 'Toute la file' }} title="Validations à traiter">
          <TodoList data={data} emptyText="Aucun gain n’attend votre validation." exportName="gains-a-valider.xlsx" types={['validation']} />
        </Panel>
        <Panel className="dash-span-5" subtitle="Fiches visibles par votre profil." title="Répartition par phase">
          <PhaseDonut data={data} />
        </Panel>
        <Panel className="dash-span-6" title="Les 6 derniers mois">
          <MonthlyBars data={data} />
        </Panel>
        <Panel className="dash-span-6" title="Actions par statut">
          <ActionStatusBars data={data} />
        </Panel>
      </div>
    </>
  )
}

export function DirectionDashboard({ data, hello, onAnneeChange }) {
  const loading = !data
  return (
    <>
      <Hero
        actions={<><HeroButton icon="files" to="/fiches">Registre des fiches</HeroButton><HeroButton icon="validation" to="/validations" variant="ghost">Validations</HeroButton></>}
        eyebrow="Direction"
        highlights={[{ label: 'Fiches au total', value: data?.fiches_total ?? '—' }, ...overview(data).slice(1)]}
        text="Vue d’ensemble de la démarche A3 : volume, avancement, délais et valeur créée."
        title={hello}
      />
      <KpiRow>
        <KpiCard icon="file" label="Fiches ouvertes" loading={loading} to="/fiches" tone="brand" value={data?.fiches_ouvertes} />
        <KpiCard icon="clock" label="Fiches en retard" loading={loading} to="/fiches" tone={alertTone(data?.fiches_en_retard)} value={data?.fiches_en_retard} />
        <KpiCard icon="al" label="Actions en retard" loading={loading} to="/fiches" tone={alertTone(data?.actions_en_retard)} value={data?.actions_en_retard} />
        <KpiCard icon="users" label="Fiches sans pilote" loading={loading} to="/fiches" tone={alertTone(data?.fiches_sans_pilote)} value={data?.fiches_sans_pilote} />
      </KpiRow>
      <div className="dash-grid">
        <Panel className="dash-span-3" title={`Taux de clôture ${data?.annee ?? ''}`}>
          <Ring caption={`des fiches créées en ${data?.annee ?? 'cours d’année'}`} label={percent(data?.taux_cloture)} tone="success" value={data?.taux_cloture} />
        </Panel>
        <Panel className="dash-span-3" title={`Délai moyen de clôture ${data?.annee ?? ''}`}>
          <Ring caption="de la déclaration à la clôture" label={days(data?.delai_moyen_cloture_jours)} tone="info" value={data?.delai_moyen_cloture_jours ? Math.min(data.delai_moyen_cloture_jours / 180 * 100, 100) : 0} />
        </Panel>
        <Panel className="dash-span-3" title="Vérification d’efficacité">
          <Ring caption="des fiches mesurées ont leurs contrôles à jour" label={percent(data?.part_verification_efficacite)} tone="brand" value={data?.part_verification_efficacite} />
        </Panel>
        <article className="dash-span-3 dash-money__main dash-money__main--panel">
          <span className="dash-money__head">Gains annuels validés<YearSelect data={data} onChange={onAnneeChange} /></span>
          <strong>{data ? shortFcfa(data.gains_valides_annee ?? 0) : '—'}</strong>
          <small>{data ? `Montants validés par le Contrôle de gestion en ${data.annee}` : ''}</small>
        </article>
        <Panel className="dash-span-4" title="Fiches par unité">
          <RepartitionBars axe="unite" data={data} />
        </Panel>
        <Panel className="dash-span-4" title="Par type d’amélioration">
          <RepartitionBars axe="type_amelioration" data={data} />
        </Panel>
        <Panel className="dash-span-4" title="Par origine">
          <RepartitionBars axe="origine" data={data} />
        </Panel>
        <Panel className="dash-span-12" subtitle="Toutes les fiches, étape par étape." title="Portefeuille des fiches">
          <StageFlow data={data} />
        </Panel>
        <Panel className="dash-span-6" title="Répartition par phase">
          <PhaseDonut data={data} />
        </Panel>
        <Panel className="dash-span-6" subtitle="Fiches déclarées chaque mois." title="Dynamique de déclaration">
          <MonthlyBars data={data} />
        </Panel>
        <Panel className="dash-span-6" title="Actions par statut">
          <ActionStatusBars data={data} />
        </Panel>
        <Panel className="dash-span-6" title="À traiter">
          <TodoList data={data} />
        </Panel>
      </div>
    </>
  )
}

const ADMIN_SHORTCUTS = [
  { to: '/admin/utilisateurs', icon: 'users', label: 'Utilisateurs', description: 'Comptes, accès et mots de passe' },
  { to: '/admin/affectations', icon: 'assignments', label: 'Affectations', description: 'Rôles et périmètres par unité' },
  { to: '/admin/unites', icon: 'unit', label: 'Unités', description: 'Organisation de la raffinerie' },
  { to: '/admin/equipements', icon: 'equipment', label: 'Équipements', description: 'Référentiel par unité' },
  { to: '/admin/listes', icon: 'lists', label: 'Listes de choix', description: 'Origines, types et valeurs' },
  { to: '/admin/parametres-fonctionnels', icon: 'settings', label: 'Paramètres', description: 'Délais et règles métier' },
]

export function AdminDashboard({ data, hello }) {
  const loading = !data
  return (
    <>
      <Hero
        actions={<><HeroButton icon="users" to="/admin/utilisateurs">Gérer les utilisateurs</HeroButton><HeroButton icon="assignments" to="/admin/affectations" variant="ghost">Affectations</HeroButton></>}
        eyebrow="Administration fonctionnelle"
        highlights={[{ label: 'Fiches au total', value: data?.fiches_total ?? '—' }, ...overview(data).slice(1)]}
        text="Tenez à jour le référentiel et les affectations pour que chaque fiche trouve son pilote."
        title={hello}
      />
      <KpiRow>
        <KpiCard icon="users" label="Fiches sans pilote" loading={loading} to="/fiches" tone={alertTone(data?.fiches_sans_pilote)} value={data?.fiches_sans_pilote} />
        <KpiCard icon="assignments" label="Affectations actives" loading={loading} to="/admin/affectations" tone="brand" value={data?.affectations_actives} />
        <KpiCard icon="file" label="Fiches ouvertes" loading={loading} to="/fiches" tone="info" value={data?.fiches_ouvertes} />
        <KpiCard icon="clock" label="Actions en retard" loading={loading} to="/fiches" tone={alertTone(data?.actions_en_retard)} value={data?.actions_en_retard} />
      </KpiRow>
      <div className="dash-grid">
        <Panel className="dash-span-8" title="Référentiel">
          <Shortcuts items={ADMIN_SHORTCUTS} />
        </Panel>
        <Panel className="dash-span-4" title="À régulariser">
          <TodoList data={data} emptyText="Toutes les fiches ont un pilote et un valideur disponible." types={['reattribution', 'pilote']} />
        </Panel>
        <Panel className="dash-span-12" title="Parcours des fiches">
          <StageFlow data={data} />
        </Panel>
        <Panel className="dash-span-6" title="Priorités par type">
          <TodoTypeSummary data={data} />
        </Panel>
        <Panel className="dash-span-6" title="Les 6 derniers mois">
          <MonthlyBars data={data} />
        </Panel>
      </div>
    </>
  )
}
