import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../auth/api.js'
import Alert from '../ui/Alert.jsx'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import { Select, TextInput } from '../ui/FormControls.jsx'
import Icon from '../ui/Icon.jsx'
import Modal from '../ui/Modal.jsx'
import Spinner from '../ui/Spinner.jsx'
import { personName } from '../../utils/format.js'
import './UserCreationWizard.css'

const STEPS = [
  { key: 'source', label: 'Type de compte' },
  { key: 'personne', label: 'Personne' },
  { key: 'role', label: 'Rôle' },
  { key: 'affectation', label: 'Affectation' },
  { key: 'responsabilite', label: 'Responsabilité' },
  { key: 'recap', label: 'Vérification' },
]

// Étape où s'affiche l'erreur renvoyée par le serveur pour chaque champ.
const FIELD_STEP = {
  identifiant: 1, nom: 1, prenom: 1, email: 1, ldap_dn: 1,
  role_id: 2,
  unite_id: 3, entite_id: 3,
  responsable_entite_id: 4,
}

const ENTITY_TYPES = [
  { value: 'SERVICE', label: 'Un service' },
  { value: 'DEPARTEMENT', label: 'Un département' },
  { value: 'DIRECTION', label: 'Une direction' },
]
const TYPE_LABEL = { DIRECTION: 'Direction', DEPARTEMENT: 'Département', SERVICE: 'Service' }

// Profil donné par l'organigramme au responsable d'un département, jamais choisi à la main.
const ROLE_CHEF = 'CHEF_DEPARTEMENT'

const EMPTY = {
  auth_source: 'ldap',
  personne: null,
  identifiant: '', prenom: '', nom: '', email: '',
  role_id: '',
  unite_id: '',
  entite_id: '',
  responsable: 'non',
  responsable_entite_id: '',
}

const entityLabel = (entity) => (entity.parent ? `${entity.libelle} · ${entity.parent}` : entity.libelle)

function ChoiceCard({ checked, children, description, disabled, icon, name, onChange, title, badge }) {
  return (
    <label className={`user-wizard__choice${checked ? ' is-checked' : ''}${disabled ? ' is-disabled' : ''}`}>
      <input checked={checked} disabled={disabled} name={name} onChange={onChange} type="radio" />
      {icon && <span aria-hidden="true" className="user-wizard__choice-icon"><Icon name={icon} size={20} /></span>}
      <span className="user-wizard__choice-text">
        <strong>{title}{badge}</strong>
        {description && <small>{description}</small>}
        {children}
      </span>
    </label>
  )
}

/**
 * Création d'un utilisateur en étapes : annuaire LDAP (par défaut) ou compte local, puis la
 * personne, son rôle, son affectation et, s'il y a lieu, l'entité dont il est responsable.
 * Tout part en un seul envoi à la dernière étape. La page ne la monte que pendant l'ouverture.
 */
function UserCreationWizard({ open, onClose, onCreated }) {
  const [step, setStep] = useState(0)
  const [values, setValues] = useState(EMPTY)
  const [refs, setRefs] = useState({ roles: [], units: [], entities: [] })
  const [refsError, setRefsError] = useState('')
  const [query, setQuery] = useState('')
  const [directory, setDirectory] = useState({ loading: false, people: [], source: null, error: '' })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')

  const set = (patch) => setValues((current) => ({ ...current, ...patch }))

  // La fenêtre est montée à chaque ouverture : elle repart d'un formulaire vide.
  useEffect(() => {
    let cancelled = false
    Promise.all(['/admin/roles', '/admin/units', '/admin/entities'].map((endpoint) => apiRequest(endpoint)))
      .then(([roles, units, entities]) => {
        if (!cancelled) setRefs({ roles: roles.data, units: units.data, entities: entities.data })
      })
      .catch((error) => { if (!cancelled) setRefsError(error.message) })
    return () => { cancelled = true }
  }, [])

  // Recherche dans l'annuaire, 300 ms après la dernière frappe.
  const searching = open && values.auth_source === 'ldap' && step === 1
  useEffect(() => {
    if (!searching) return undefined
    let cancelled = false
    const timer = window.setTimeout(() => {
      setDirectory((current) => ({ ...current, loading: true, error: '' }))
      apiRequest(`/admin/annuaire?q=${encodeURIComponent(query.trim())}`)
        .then((result) => { if (!cancelled) setDirectory({ loading: false, people: result.data, source: result.meta?.source, error: '' }) })
        .catch((error) => { if (!cancelled) setDirectory({ loading: false, people: [], source: null, error: error.message }) })
    }, 300)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [query, searching])

  const roles = refs.roles.filter((role) => role.code !== ROLE_CHEF)
  const role = refs.roles.find((item) => String(item.id) === String(values.role_id))
  const units = refs.units.filter((unit) => unit.actif)
  const entities = refs.entities.filter((entity) => entity.actif)
  const unit = refs.units.find((item) => String(item.id) === String(values.unite_id))
  const rattachement = refs.entities.find((item) => String(item.id) === String(values.entite_id))
  const responsableDe = refs.entities.find((item) => String(item.id) === String(values.responsable_entite_id))
  const candidates = useMemo(
    () => entities.filter((entity) => entity.type === values.responsable).sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr')),
    [entities, values.responsable],
  )

  const person = values.auth_source === 'ldap'
    ? values.personne
    : { identifiant: values.identifiant.trim(), prenom: values.prenom.trim(), nom: values.nom.trim(), email: values.email.trim() }
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())

  const stepValid = [
    true,
    values.auth_source === 'ldap'
      ? Boolean(values.personne)
      : Boolean(person.identifiant && person.prenom && person.nom && emailValid),
    Boolean(role),
    !role?.par_unite || Boolean(values.unite_id),
    values.responsable === 'non' || Boolean(values.responsable_entite_id),
    true,
  ]
  const dirty = step > 0 || values.auth_source !== EMPTY.auth_source

  function chooseResponsable(type) {
    // Rattaché à une entité du type choisi : elle est proposée d'emblée.
    const proposal = rattachement?.type === type && rattachement.actif ? String(rattachement.id) : ''
    set({ responsable: type, responsable_entite_id: type === 'non' ? '' : proposal })
  }

  function goTo(index) {
    setFormError('')
    setStep(index)
  }

  async function submit() {
    setSaving(true)
    setErrors({})
    setFormError('')
    const ldap = values.auth_source === 'ldap'
    const payload = {
      auth_source: values.auth_source,
      ldap_dn: ldap ? values.personne.ldap_dn : null,
      identifiant: person.identifiant,
      prenom: person.prenom,
      nom: person.nom,
      email: person.email,
      role_id: values.role_id || null,
      unite_id: role?.par_unite ? values.unite_id || null : null,
      entite_id: values.entite_id || null,
      responsable_entite_id: values.responsable === 'non' ? null : values.responsable_entite_id || null,
    }
    try {
      const result = await apiRequest('/admin/users', { method: 'POST', body: JSON.stringify(payload) })
      onCreated(result.data)
    } catch (error) {
      const fieldErrors = error.data?.errors ?? {}
      const fields = Object.keys(fieldErrors)
      setErrors(fieldErrors)
      if (fields.length) {
        const target = Math.min(...fields.map((field) => FIELD_STEP[field] ?? 5))
        // Un compte annuaire n'a pas de champ à corriger : le message reste lisible à l'étape Personne.
        setFormError(ldap && target === 1 ? fields.flatMap((field) => fieldErrors[field]).join(' ') : '')
        setStep(target)
      } else {
        setFormError(error.message)
      }
    } finally {
      setSaving(false)
    }
  }

  function renderSource() {
    return (
      <fieldset className="user-wizard__fieldset">
        <legend>Comment cette personne se connectera-t-elle ?</legend>
        <div className="user-wizard__choices user-wizard__choices--two">
          <ChoiceCard
            badge={<Badge tone="success">Recommandé</Badge>}
            checked={values.auth_source === 'ldap'}
            description="Elle utilise son identifiant et son mot de passe Windows de la SAR. Vous la choisissez dans l’annuaire."
            icon="users"
            name="auth_source"
            onChange={() => set({ auth_source: 'ldap' })}
            title="Annuaire LDAP"
          />
          <ChoiceCard
            checked={values.auth_source === 'local'}
            description="Pour une personne absente de l’annuaire (prestataire, stagiaire). Elle reçoit un lien par courriel pour créer son mot de passe."
            icon="lock"
            name="auth_source"
            onChange={() => set({ auth_source: 'local' })}
            title="Compte local"
          />
        </div>
      </fieldset>
    )
  }

  function renderPersonLdap() {
    return (
      <div className="user-wizard__stack">
        {directory.source === 'demo' && (
          <Alert severity="info">Annuaire de démonstration : les personnes ci-dessous sont fictives. L’annuaire de la SAR se branche dans <code>backend/.env</code> (<code>ANNUAIRE=ldap</code>).</Alert>
        )}
        {formError && <Alert severity="error">{formError}</Alert>}
        <TextInput
          data-modal-autofocus
          hint="Nom, prénom, identifiant ou courriel."
          label="Rechercher dans l’annuaire"
          onChange={setQuery}
          placeholder="Ex. Diallo"
          type="search"
          value={query}
        />
        {directory.error && <Alert severity="error">{directory.error}</Alert>}
        <div aria-busy={directory.loading || undefined} aria-label="Personnes trouvées" className="user-wizard__people" role="radiogroup">
          {directory.loading && !directory.people.length && <div className="user-wizard__empty"><Spinner size="sm" /> Recherche…</div>}
          {!directory.loading && !directory.error && !directory.people.length && (
            <div className="user-wizard__empty">Personne ne correspond à « {query} ». Essayez un autre nom, ou créez un compte local.</div>
          )}
          {directory.people.map((entry) => (
            <ChoiceCard
              badge={entry.compte_id ? <Badge tone="inactive">Compte existant</Badge> : null}
              checked={values.personne?.ldap_dn === entry.ldap_dn}
              description={[entry.identifiant, entry.email, entry.fonction].filter(Boolean).join(' · ')}
              disabled={Boolean(entry.compte_id)}
              key={entry.ldap_dn}
              name="personne"
              onChange={() => set({ personne: entry })}
              title={personName(entry)}
            />
          ))}
        </div>
      </div>
    )
  }

  function renderPersonLocal() {
    return (
      <div className="user-wizard__grid">
        <TextInput data-modal-autofocus error={errors.prenom} label="Prénom" maxLength={255} onChange={(prenom) => set({ prenom })} required value={values.prenom} />
        <TextInput error={errors.nom} label="Nom" maxLength={255} onChange={(nom) => set({ nom })} required value={values.nom} />
        <TextInput error={errors.identifiant} hint="Ex. prenom.nom : il sert à se connecter." label="Identifiant" maxLength={255} onChange={(identifiant) => set({ identifiant })} required value={values.identifiant} />
        <TextInput
          error={errors.email ?? (values.email && !emailValid ? 'Adresse de courriel invalide.' : undefined)}
          hint="Le lien de création du mot de passe y est envoyé."
          label="Courriel"
          maxLength={255}
          onChange={(email) => set({ email })}
          required
          type="email"
          value={values.email}
        />
      </div>
    )
  }

  function renderRole() {
    return (
      <fieldset className="user-wizard__fieldset">
        <legend>Quel rôle aura {person?.prenom || 'cette personne'} dans l’application ?</legend>
        {errors.role_id && <Alert severity="error">{errors.role_id[0]}</Alert>}
        <div className="user-wizard__choices user-wizard__choices--two">
          {roles.map((item) => (
            <ChoiceCard
              checked={String(values.role_id) === String(item.id)}
              description={item.par_unite ? 'Rattaché à une unité' : 'Sur toute la raffinerie'}
              key={item.id}
              name="role_id"
              onChange={() => set({ role_id: String(item.id), unite_id: item.par_unite ? values.unite_id : '' })}
              title={item.libelle}
            />
          ))}
        </div>
        <p className="user-wizard__note">Le profil <strong>Chef de département</strong> ne se choisit pas ici : il est donné au responsable d’un département, à l’étape Responsabilité.</p>
      </fieldset>
    )
  }

  function renderAffectation() {
    return (
      <div className="user-wizard__stack">
        {role?.par_unite ? (
          <Select
            error={errors.unite_id}
            hint={`Le rôle ${role.libelle} s’exerce sur les fiches de cette unité.`}
            label="Unité"
            onChange={(unite_id) => set({ unite_id })}
            options={units.map((item) => [String(item.id), item.libelle])}
            placeholder="Choisir une unité…"
            required
            value={values.unite_id}
          />
        ) : (
          <Alert severity="info">Le rôle {role?.libelle} est global : il ne se rattache pas à une unité.</Alert>
        )}
        <Select
          error={errors.entite_id}
          hint="Direction, département ou service de la personne dans l’organigramme. Ses fiches partent en validation de pertinence chez le chef de son département."
          label="Rattachement dans l’organigramme"
          onChange={(entite_id) => set({ entite_id })}
          options={entities.map((item) => [String(item.id), `${entityLabel(item)} (${TYPE_LABEL[item.type]})`])}
          placeholder="Non rattaché"
          value={values.entite_id}
        />
      </div>
    )
  }

  function renderResponsabilite() {
    return (
      <div className="user-wizard__stack">
        <fieldset className="user-wizard__fieldset">
          <legend>Cette personne est-elle responsable d’un service, d’un département ou d’une direction ?</legend>
          <div className="user-wizard__segmented" role="radiogroup">
            {[{ value: 'non', label: 'Non' }, ...ENTITY_TYPES].map((option) => (
              <label className={values.responsable === option.value ? 'is-checked' : ''} key={option.value}>
                <input checked={values.responsable === option.value} name="responsable" onChange={() => chooseResponsable(option.value)} type="radio" />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        {values.responsable !== 'non' && (
          <>
            <Select
              error={errors.responsable_entite_id}
              label={`${TYPE_LABEL[values.responsable]} dont la personne est responsable`}
              onChange={(responsable_entite_id) => set({ responsable_entite_id })}
              options={candidates.map((item) => [String(item.id), entityLabel(item)])}
              placeholder="Choisir…"
              required
              value={values.responsable_entite_id}
            />
            {!candidates.length && <Alert severity="warning">Aucune entité de ce type n’est active. Créez-la d’abord dans l’écran Organigramme.</Alert>}
            {responsableDe?.responsable && (
              <Alert severity="warning">{responsableDe.responsable} est aujourd’hui responsable de {responsableDe.libelle} : la nouvelle personne prendra sa place.</Alert>
            )}
            {values.responsable === 'DEPARTEMENT' && (
              <Alert severity="info">La personne recevra le profil Chef de département et validera la pertinence des fiches de ce département.</Alert>
            )}
          </>
        )}
      </div>
    )
  }

  function renderRecap() {
    const rows = [
      ['Type de compte', values.auth_source === 'ldap' ? 'Annuaire LDAP' : 'Compte local', 0],
      ['Personne', `${personName(person)} · ${person.identifiant}`, 1],
      ['Courriel', person.email, 1],
      ['Rôle', role?.libelle, 2],
      ['Unité', role?.par_unite ? unit?.libelle : 'Global', 3],
      ['Rattachement', rattachement ? `${entityLabel(rattachement)} (${TYPE_LABEL[rattachement.type]})` : 'Non rattaché', 3],
      ['Responsable de', responsableDe ? `${entityLabel(responsableDe)} (${TYPE_LABEL[responsableDe.type]})` : 'Aucune entité', 4],
    ]
    return (
      <div className="user-wizard__stack">
        {formError && <Alert severity="error">{formError}</Alert>}
        <dl className="user-wizard__recap">
          {rows.map(([label, value, target]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
              <Button onClick={() => goTo(target)} size="small" type="button" variant="ghost">Modifier</Button>
            </div>
          ))}
        </dl>
        <Alert severity="info">
          {values.auth_source === 'ldap'
            ? 'La personne se connecte tout de suite avec son identifiant et son mot de passe de l’annuaire.'
            : 'La personne reçoit par courriel le lien pour créer son mot de passe.'}
        </Alert>
      </div>
    )
  }

  const content = [
    renderSource,
    values.auth_source === 'ldap' ? renderPersonLdap : renderPersonLocal,
    renderRole,
    renderAffectation,
    renderResponsabilite,
    renderRecap,
  ][step]
  const last = step === STEPS.length - 1

  return (
    <Modal
      dirty={dirty}
      footer={({ requestClose }) => (
        <div className="user-wizard__footer">
          <Button disabled={saving} onClick={requestClose} type="button" variant="ghost">Annuler</Button>
          <span className="user-wizard__footer-nav">
            {step > 0 && <Button disabled={saving} icon="page-previous" onClick={() => goTo(step - 1)} type="button" variant="secondary">Précédent</Button>}
            {last
              ? <Button icon="check" loading={saving} loadingLabel="Création…" onClick={submit} type="button">Créer le compte</Button>
              : <Button disabled={!stepValid[step] || Boolean(refsError)} onClick={() => goTo(step + 1)} type="button">Suivant</Button>}
          </span>
        </div>
      )}
      onClose={onClose}
      open={open}
      size="lg"
      subtitle={`Étape ${step + 1} sur ${STEPS.length} · ${STEPS[step].label}`}
      title="Créer un utilisateur"
    >
      <ol className="user-wizard__steps">
        {STEPS.map((item, index) => {
          const reachable = index < step || stepValid.slice(0, index).every(Boolean)
          const state = index === step ? 'is-current' : index < step ? 'is-done' : ''
          return (
            <li className={state} key={item.key}>
              <button aria-current={index === step ? 'step' : undefined} disabled={!reachable || saving} onClick={() => goTo(index)} type="button">
                <span aria-hidden="true">{index < step ? <Icon name="check" size={13} /> : index + 1}</span>
                {item.label}
              </button>
            </li>
          )
        })}
      </ol>
      {refsError && <Alert severity="error">{refsError}</Alert>}
      <div className="user-wizard__body">{content()}</div>
    </Modal>
  )
}

export default UserCreationWizard
