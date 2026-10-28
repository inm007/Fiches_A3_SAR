import { useContext, useState } from 'react'
import Button from '../../ui/Button.jsx'
import ConfirmDialog from '../../ui/ConfirmDialog.jsx'
import Badge from '../../ui/Badge.jsx'
import FileInput from '../../ui/FileInput.jsx'
import PreuveJointe from '../PreuveJointe.jsx'
import { FICHIERS_ACCEPTES, PiecesJointesContext } from '../preuves.js'
import { Select, TextArea, TextInput } from '../../ui/FormControls.jsx'
import { describeError, ficheService } from '../../../services/ficheService.js'
import { JALONS } from '../../../utils/constants.js'
import { formatDate } from '../../../utils/format.js'
import { avecSuivi } from '../../../utils/toast.js'
import { peopleOptions } from '../sections/options.js'
import './FicheTab.css'

const emptyForm = { resultat: 'CONFORME', commentaire: '', preuve: '', description: '', responsable_id: '', echeance: '' }

function etat(controle) {
  if (controle.resultat === 'CONFORME') return ['success', 'Conforme']
  if (controle.resultat === 'NON_CONFORME') return ['error', 'Non conforme']
  return controle.disponible ? ['warning', 'À faire'] : ['neutral', 'À venir']
}

export default function ControlesTab({ fiche, options, onChange, onError }) {
  const [controle, setControle] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [fichier, setFichier] = useState(null)
  const { recharger } = useContext(PiecesJointesContext)
  const actions = fiche.actions.filter((action) => action.controles.length > 0)
  const set = (field) => (value) => setForm((current) => ({ ...current, [field]: value }))
  const critereDe = (item) => fiche.actions.find((action) => action.controles.some((current) => current.id === item.id))?.critere_efficacite

  async function save() {
    setBusy(true)
    try {
      const corrective = form.resultat === 'NON_CONFORME'
        ? { description: form.description, echeance: form.echeance, responsable_id: form.responsable_id ? Number(form.responsable_id) : null }
        : null
      const updated = await avecSuivi(`Enregistrement du contrôle ${JALONS[controle.jalon]} en cours…`, async () => {
        // Le fichier part d'abord : s'il est refusé (format, taille), le contrôle n'est pas enregistré.
        if (fichier) await ficheService.ajouterPieceJointe(fiche.id, fichier, { objet: 'controle', objetId: controle.id })
        return ficheService.controle(controle.id, {
          resultat: form.resultat,
          commentaire: form.commentaire || null,
          preuve: form.preuve || (fichier ? fichier.name : null),
          ...(corrective ? { action_corrective: corrective } : {}),
        })
      }, { succes: `Contrôle ${JALONS[controle.jalon]} enregistré`, echec: 'Le contrôle n’a pas été enregistré.' })
      if (fichier) recharger()
      onChange(updated)
      setControle(null)
      setForm(emptyForm)
      setFichier(null)
    } catch (error) {
      setControle(null)
      onError(describeError(error))
    } finally {
      setBusy(false)
    }
  }

  // Rien à montrer tant qu'aucune action n'est réalisée : l'onglet « Actions et contrôles » reste court.
  if (actions.length === 0) return null

  return (
    <section className="fiche-tab" data-fiche-tab="controles">
      <h2>Contrôles d’efficacité</h2>
      <p className="fiche-tab__help">
        Trois contrôles par action réalisée (J+30, J+60, J+90). Non conforme : une action corrective, revérifiée à 30 jours. Tous conformes avant la clôture.
      </p>
      {actions.map((action) => (
        <div data-action-id={action.id} key={action.id}>
          <h3>{action.action_origine_id ? 'Action corrective — ' : ''}{action.description}</h3>
          {action.critere_efficacite && <p className="fiche-tab__muted">Critère d’efficacité : {action.critere_efficacite}</p>}
          <div className="fiche-tab__grid">
            {action.controles.map((item) => {
              const [tone, label] = etat(item)
              return (
                <article className="fiche-tab__card" key={item.id}>
                  <header><strong>{JALONS[item.jalon]}</strong><Badge tone={tone}>{label}</Badge></header>
                  <span className="fiche-tab__muted">Échéance : {formatDate(item.date_echeance)}{item.date_effective && ` · fait le ${formatDate(item.date_effective)}`}</span>
                  {item.commentaire && <span>{item.commentaire}</span>}
                  {item.preuve && <span className="fiche-tab__muted">Preuve : {item.preuve}</span>}
                  {item.date_effective && <PreuveJointe fiche={fiche} objet="controle" objetId={item.id} />}
                  {item.disponible && fiche.droits.peut_enregistrer_controles && (
                    <Button type="button" onClick={() => setControle(item)}>Enregistrer le résultat</Button>
                  )}
                </article>
              )
            })}
          </div>
        </div>
      ))}

      <ConfirmDialog
        busy={busy}
        confirmLabel="Enregistrer le contrôle"
        disabled={form.resultat === 'NON_CONFORME' ? (!form.description.trim() || !form.echeance) : (!form.commentaire.trim() && !form.preuve.trim() && !fichier)}
        open={Boolean(controle)}
        title={controle ? `Contrôle ${JALONS[controle.jalon]}` : ''}
        variant="primary"
        onCancel={() => setControle(null)}
        onConfirm={save}
      >
        {controle && critereDe(controle) && <p className="fiche-tab__muted">Critère à vérifier : {critereDe(controle)}</p>}
        <Select label="Résultat" options={[['CONFORME', 'Conforme'], ['NON_CONFORME', 'Non conforme']]} required value={form.resultat} onChange={set('resultat')} />
        <TextArea hint={form.resultat === 'CONFORME' ? 'Ce que vous avez constaté (ou une preuve ci-dessous) : obligatoire pour un contrôle conforme.' : undefined} label="Constat" value={form.commentaire} onChange={set('commentaire')} />
        <TextInput label="Preuve (référence)" value={form.preuve} onChange={set('preuve')} />
        {fiche.droits.peut_ajouter_piece_jointe && <FileInput accept={FICHIERS_ACCEPTES} file={fichier} label="Ou joindre un document ou une photo" onChange={setFichier} />}
        {form.resultat === 'NON_CONFORME' && (
          <>
            <TextArea label="Action corrective" required value={form.description} onChange={set('description')} />
            <Select label="Responsable" options={peopleOptions(options?.responsables)} value={form.responsable_id} onChange={set('responsable_id')} />
            <TextInput label="Échéance" required type="date" value={form.echeance} onChange={set('echeance')} />
          </>
        )}
      </ConfirmDialog>
    </section>
  )
}
