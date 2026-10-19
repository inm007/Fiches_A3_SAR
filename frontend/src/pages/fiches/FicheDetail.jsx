import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Alert from '../../components/ui/Alert.jsx'
import FicheHeader from '../../components/fiche/FicheHeader.jsx'
import ErrorPage from '../../components/shared/ErrorPage.jsx'
import Tabs from '../../components/ui/Tabs.jsx'
import MissingConditionsPanel from '../../components/fiche/MissingConditionsPanel.jsx'
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
import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { ficheService } from '../../services/ficheService.js'
import { setCrumb } from '../../utils/crumb.js'
import PageLoader from '../../components/shared/PageLoader.jsx'
import './FicheDetail.css'

const tabComponents = {
  actions: ActionsTab,
  controles: ControlesTab,
  validations: ValidationsTab,
  pieces: PiecesJointesTab,
  commentaires: CommentairesTab,
  historique: HistoriqueTab,
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
  function exportPdf() {
    const previousTitle = document.title
    document.title = `${fiche.numero_a3} - ${fiche.titre}`
    window.print()
    window.setTimeout(() => { document.title = previousTitle }, 1000)
  }
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
    { key: 'actions', label: 'Actions', count: fiche.actions.filter((action) => action.en_retard).length },
    { key: 'controles', label: 'Contrôles', count: fiche.actions.flatMap((action) => action.controles).filter((controle) => controle.disponible).length },
    { key: 'validations', label: 'Validations', count: actionnables + (fiche.droits.peut_decider_gains ? 1 : 0) },
    { key: 'pieces', label: 'Pièces jointes' },
    { key: 'commentaires', label: 'Commentaires' },
    ...(fiche.droits.peut_voir_historique ? [{ key: 'historique', label: 'Historique' }] : []),
  ]
  const TabComponent = tabComponents[tab]

  return (
    <div className="fiche-detail-page">
      <FicheHeader fiche={fiche}>
        <Button type="button" variant="secondary" onClick={exportPdf}><Icon name="pdf" />Exporter en PDF A3</Button>
        <WorkflowActions fiche={fiche} options={options} onChange={onChange} onError={onError} />
      </FicheHeader>
      <MissingConditionsPanel error={panel} onClose={() => setPanel(null)} onReload={reload} />
      <Tabs active={tab} idPrefix="fiche-tab" label="Rubriques de la fiche" tabs={tabs} onChange={goToTab} />
      <div aria-labelledby={`fiche-tab-${tab}`} id={`fiche-tab-panel-${tab}`} role="tabpanel">
        {tab === 'fiche' ? (
          <div className="fiche-detail-page__body">
            <aside className="fiche-detail-page__stepper">
              <SectionStepper active={section} completude={fiche.completude} editables={fiche.droits.sections_editables} onSelect={goToSection} />
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
              onSaved={onChange}
            />
          </div>
        ) : (
          <TabComponent fiche={fiche} options={options} refs={refs} onChange={onChange} onError={onError} />
        )}
      </div>
      <FichePrintView fiche={fiche} refs={refs} />
    </div>
  )
}

export default FicheDetail
