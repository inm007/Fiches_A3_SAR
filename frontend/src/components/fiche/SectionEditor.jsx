import { useEffect, useState } from 'react'
import Button from '../ui/Button.jsx'
import SaveIndicator from '../ui/SaveIndicator.jsx'
import { describeError, ficheService } from '../../services/ficheService.js'
import { SECTIONS } from '../../utils/constants.js'
import { formatDateTime } from '../../utils/format.js'
import Icon from '../ui/Icon.jsx'
import { toast } from '../../utils/toast.js'
import Section01Identification from './sections/Section01Identification.jsx'
import Section02Contexte from './sections/Section02Contexte.jsx'
import Section03SituationActuelle from './sections/Section03SituationActuelle.jsx'
import Section04Objectif from './sections/Section04Objectif.jsx'
import Section05Causes from './sections/Section05Causes.jsx'
import Section06Actions from './sections/Section06Actions.jsx'
import Section07RisquesMoc from './sections/Section07RisquesMoc.jsx'
import Section08Resultats from './sections/Section08Resultats.jsx'
import Section09Gains from './sections/Section09Gains.jsx'
import Section10Perennisation from './sections/Section10Perennisation.jsx'
import Section11Lecons from './sections/Section11Lecons.jsx'
import Section12Validation from './sections/Section12Validation.jsx'
import { sectionModel } from './sections/sectionModel.js'
import './SectionEditor.css'

const ETATS = {
  fige: { label: 'Figée', icon: 'lock' },
  a_venir: { label: 'À venir', icon: 'clock' },
  auto: { label: 'Automatique', icon: 'validation' },
  lecture: { label: 'Lecture seule', icon: 'eye' },
}

const components = {
  1: Section01Identification, 2: Section02Contexte, 3: Section03SituationActuelle, 4: Section04Objectif,
  5: Section05Causes, 6: Section06Actions, 7: Section07RisquesMoc, 8: Section08Resultats,
  9: Section09Gains, 10: Section10Perennisation, 11: Section11Lecons, 12: Section12Validation,
}

/**
 * Carte d'une section : brouillon local, enregistrement explicite et état de sauvegarde.
 * Le succès n'est affiché qu'après la réponse positive du serveur (UX §10.1).
 */
function SectionEditor({ fiche, section, refs, options, onSaved, onError, onNavigate, onDirtyChange, onPrintCopy }) {
  const [draft, setDraft] = useState(() => sectionModel[section].toDraft(fiche, options))
  const [state, setState] = useState('idle')
  const [failure, setFailure] = useState('')
  const editable = fiche.droits.sections_editables.includes(section)
  const etat = fiche.droits.sections_etat?.find((item) => item.numero === section)
  const badge = editable ? null : ETATS[etat?.etat] ?? ETATS.lecture
  const dernier = fiche.derniers_enregistrements?.find((item) => item.numero === section)
  const Component = components[section]

  useEffect(() => {
    onDirtyChange?.(state === 'dirty' || state === 'error')
  }, [state, onDirtyChange])

  useEffect(() => {
    if (state !== 'dirty') return undefined
    const warn = (event) => { event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [state])

  const set = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }))
    setState('dirty')
  }

  async function save() {
    setState('saving')
    setFailure('')
    try {
      const saved = await ficheService.saveSection(fiche.id, section, sectionModel[section].toPayload(draft))
      setDraft(sectionModel[section].toDraft(saved, options))
      setState('saved')
      onSaved(saved)
      toast(`Section ${section} enregistrée`)
    } catch (error) {
      const described = describeError(error)
      setFailure(described.message)
      setState('error')
      onError(described)
    }
  }

  return (
    <section className={`section-editor${editable ? '' : ' section-editor--readonly'}`} aria-labelledby="section-editor-title" data-fiche-section={section}>
      <header>
        <h2 id="section-editor-title">{section}. {SECTIONS[section - 1]}</h2>
        {badge && <span className="section-editor__readonly"><Icon name={badge.icon} size={13} />{badge.label}</span>}
      </header>
      {(etat?.raison || dernier) && (
        <p className="section-editor__context">
          {etat?.raison && etat.etat !== 'lecture' && <span>{etat.raison}</span>}
          {dernier && <span>Dernier enregistrement : {dernier.par ?? 'inconnu'}, le {formatDateTime(dernier.le)}.</span>}
        </p>
      )}
      <Component draft={draft} fiche={fiche} options={options} readOnly={!editable} refs={refs} set={set} onFicheChange={onSaved} onPrintCopy={onPrintCopy} />
      <footer>
        {editable && state !== 'idle' && <SaveIndicator state={state === 'error' ? 'error' : state} />}
        {state === 'error' && failure && <span className="section-editor__failure">{failure}</span>}
        <span className="section-editor__spacer" />
        <Button disabled={section === 1} type="button" variant="secondary" onClick={() => onNavigate(section - 1)}>Précédent</Button>
        {editable && <Button disabled={state === 'saving' || state === 'idle' || state === 'saved'} type="button" onClick={save}>Enregistrer</Button>}
        <Button disabled={section === 12} type="button" variant="secondary" onClick={() => onNavigate(section + 1)}>Suivant</Button>
      </footer>
    </section>
  )
}

export default SectionEditor
