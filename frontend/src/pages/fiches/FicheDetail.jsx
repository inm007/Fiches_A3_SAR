import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import Alert from '../../components/ui/Alert.jsx'
import AttenduDeVousPanel from '../../components/fiche/AttenduDeVousPanel.jsx'
import FicheHeader from '../../components/fiche/FicheHeader.jsx'
import ErrorPage from '../../components/shared/ErrorPage.jsx'
import Tabs from '../../components/ui/Tabs.jsx'
import MissingConditionsPanel from '../../components/fiche/MissingConditionsPanel.jsx'
import NextStepPanel from '../../components/fiche/NextStepPanel.jsx'
import SectionEditor from '../../components/fiche/SectionEditor.jsx'
import SectionStepper from '../../components/fiche/SectionStepper.jsx'
import WorkflowActions from '../../components/fiche/WorkflowActions.jsx'
import FichePrintView from '../../components/fiche/FichePrintView.jsx'
import ActionsTab from '../../components/fiche/tabs/ActionsTab.jsx'
import CommentairesTab from '../../components/fiche/tabs/CommentairesTab.jsx'
import ControlesTab from '../../components/fiche/tabs/ControlesTab.jsx'
import HistoriqueTab from '../../components/fiche/tabs/HistoriqueTab.jsx'
import PiecesJointesTab from '../../components/fiche/tabs/PiecesJointesTab.jsx'
import ValidationsTab from '../../components/fiche/tabs/ValidationsTab.jsx'
import { avecOption } from '../../components/fiche/sections/options.js'
import { PiecesJointesContext } from '../../components/fiche/preuves.js'
import { ficheService } from '../../services/ficheService.js'
import { setCrumb } from '../../utils/crumb.js'
import PageLoader from '../../components/shared/PageLoader.jsx'
import './FicheDetail.css'

// Les contrôles suivent les actions ; les échanges mettent côte à côte commentaires et pièces
// jointes ; l'historique a son propre onglet. Les emplacements envoyés par le serveur gardent leurs anciennes clés.
const ONGLET_DE = { controles: 'actions', pieces: 'echanges', commentaires: 'echanges' }
const ongletDe = (key) => ONGLET_DE[key] ?? key

function ongletContenu(tab) {
  if (tab === 'actions') return [ActionsTab, ControlesTab]
  if (tab === 'validations') return [ValidationsTab]
  if (tab === 'historique') return [HistoriqueTab]
  return [CommentairesTab, PiecesJointesTab]
}

function FicheDetail() {
  const { id } = useParams()
  const [fiche, setFiche] = useState(null)
  const [refs, setRefs] = useState(null)
  const [options, setOptions] = useState(null)
  const [status, setStatus] = useState('loading')
  const [section, setSection] = useState(null)
  const [tab, setTab] = useState('fiche')
  const [panel, setPanel] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [pendingLocation, setPendingLocation] = useState(null)
  // Impression demandée depuis la section 12 : la fiche du moment ({ copie: null }) ou une copie figée.
  const [impression, setImpression] = useState(null)

  const load = useCallback(() => Promise.all([ficheService.get(id), ficheService.referentiels(), ficheService.options(id)])
    .then(([loaded, referentiels, ficheOptions]) => {
      setFiche(loaded)
      setRefs(referentiels)
      setOptions(ficheOptions)
      setSection((current) => current ?? (loaded.droits.sections_editables[0] ?? 1))
      setStatus('ready')
    })
    .catch((error) => setStatus(error.status === 404 ? 'not-found' : 'error')), [id])

  useEffect(() => { load() }, [load])

  // Fichiers joints à la fiche : chaque preuve des sections y retrouve les siens.
  const [pieces, setPieces] = useState([])
  const rechargerPieces = useCallback(() => ficheService.piecesJointes(id).then((result) => setPieces(result.data)).catch(() => {}), [id])
  useEffect(() => { rechargerPieces() }, [rechargerPieces])
  const piecesJointes = useMemo(() => ({ pieces, recharger: rechargerPieces }), [pieces, rechargerPieces])

  useEffect(() => {
    if (fiche?.numero_a3) setCrumb(fiche.numero_a3)
  }, [fiche?.numero_a3])

  useEffect(() => () => setCrumb(null), [])

  const reload = () => {
    setPanel(null)
    load()
  }

  const onChange = useCallback((updated) => {
    setFiche(updated)
    setPanel(null)
  }, [])
  const onError = useCallback((described) => setPanel(described), [])

  const confirmLeave = () => !dirty || window.confirm('Des modifications ne sont pas enregistrées. Les abandonner ?')
  // La vue d'impression affiche la fiche (ou la copie figée) le temps d'imprimer : A3 portrait, logo SAR.
  useEffect(() => {
    if (!impression) return undefined
    const frame = window.requestAnimationFrame(() => {
      const previousTitle = document.title
      const { copie } = impression
      document.title = `${fiche.numero_a3} - ${fiche.titre}${copie ? ` - copie boucle ${copie.version}` : ''}`
      window.print()
      window.setTimeout(() => { document.title = previousTitle }, 1000)
      setImpression(null)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [impression, fiche])
  const goToSection = (numero) => {
    if (numero < 1 || numero > 12 || !confirmLeave()) return
    setDirty(false)
    setSection(numero)
  }
  const goToTab = (key) => {
    if (key === tab || !confirmLeave()) return
    setDirty(false)
    setTab(key)
  }
  const navigateToLocation = (location) => {
    if (!confirmLeave()) return
    setDirty(false)
    setPendingLocation(location)
    if (location.type === 'section') {
      setTab('fiche')
      setSection(location.section)
    } else {
      setTab(ongletDe(location.tab))
    }
  }

  useEffect(() => {
    if (!pendingLocation) return undefined
    if (pendingLocation.type === 'section' && tab !== 'fiche') return undefined
    if (pendingLocation.type === 'tab' && tab !== ongletDe(pendingLocation.tab)) return undefined

    const frame = window.requestAnimationFrame(() => {
      let target
      if (pendingLocation.type === 'section') {
        target = document.querySelector(`[data-fiche-section="${pendingLocation.section}"]`)
      } else if (pendingLocation.action_id) {
        target = document.querySelector(`[data-action-id="${pendingLocation.action_id}"]`)
      } else {
        target = document.querySelector(`[data-fiche-tab="${pendingLocation.tab}"]`)
      }
      target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      setPendingLocation(null)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [pendingLocation, section, tab])

  if (status === 'loading') return <PageLoader label="Chargement de la fiche…" />
  if (status === 'not-found') {
    return (
      <ErrorPage
        code={404}
        description="Cette fiche n’existe pas ou votre profil actif n’y a pas accès."
        homeLabel="Retour au registre"
        homeTo="/fiches"
        icon="file"
        title="Fiche introuvable"
      />
    )
  }
  if (status === 'error') return <div className="fiche-detail-page"><Alert severity="error">Impossible de charger la fiche. Réessayez plus tard.</Alert></div>

  const actionnables = fiche.validations.filter((validation) => validation.actionnable).length
  const tabs = [
    { key: 'fiche', label: 'Fiche' },
    {
      key: 'actions',
      label: 'Actions et contrôles',
      count: fiche.actions.filter((action) => action.en_retard).length
        + fiche.actions.flatMap((action) => action.controles).filter((controle) => controle.disponible).length,
    },
    { key: 'validations', label: 'Validations', count: actionnables + (fiche.droits.peut_decider_gains ? 1 : 0) },
    { key: 'echanges', label: 'Échanges' },
    ...(fiche.droits.peut_voir_historique ? [{ key: 'historique', label: 'Historique' }] : []),
  ]

  return (
    <PiecesJointesContext.Provider value={piecesJointes}>
      <div className="fiche-detail-page">
        <FicheHeader fiche={fiche}>
          <WorkflowActions fiche={fiche} options={options} onChange={onChange} onError={onError} />
        </FicheHeader>
        <MissingConditionsPanel error={panel} onClose={() => setPanel(null)} onNavigate={navigateToLocation} onReload={reload} />
        {!panel && <NextStepPanel fiche={fiche} onChange={onChange} onError={onError} onNavigate={navigateToLocation} />}
        {!panel && <AttenduDeVousPanel fiche={fiche} onNavigate={navigateToLocation} />}
        <Tabs active={tab} idPrefix="fiche-tab" label="Rubriques de la fiche" tabs={tabs} onChange={goToTab} />
        <div aria-labelledby={`fiche-tab-${tab}`} id={`fiche-tab-panel-${tab}`} role="tabpanel">
          {tab === 'fiche' ? (
            <div className="fiche-detail-page__body">
              <aside className="fiche-detail-page__stepper">
                <SectionStepper active={section} completude={Object.values(fiche.completude ?? {})} etats={fiche.droits.sections_etat} onSelect={goToSection} />
              </aside>
              <SectionEditor
                fiche={fiche}
                key={`${section}-${fiche.statut_etape}-${fiche.version}`}
                options={options}
                refs={refs}
                section={section}
                onDirtyChange={setDirty}
                onError={onError}
                onNavigate={goToSection}
                onOptionCreee={(liste, valeur) => setRefs((current) => avecOption(current, liste, valeur))}
                onPrint={(copie) => setImpression({ copie })}
                onSaved={onChange}
              />
            </div>
          ) : (
            <div className={`fiche-detail-page__group${tab === 'echanges' ? ' fiche-detail-page__group--echanges' : ''}`}>
              {ongletContenu(tab).map((TabComponent, index) => (
                <TabComponent fiche={fiche} key={index} options={options} refs={refs} onChange={onChange} onError={onError} />
              ))}
            </div>
          )}
        </div>
        <FichePrintView copie={impression?.copie} fiche={impression?.copie?.contenu ?? fiche} refs={refs} />
      </div>
    </PiecesJointesContext.Provider>
  )
}

export default FicheDetail
