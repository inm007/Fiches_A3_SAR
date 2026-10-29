import { useContext, useState } from 'react'
import Button from '../../ui/Button.jsx'
import ConfirmDialog from '../../ui/ConfirmDialog.jsx'
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

// État d'un jalon : couleur de la case, libellé et ce qu'on montre comme date.
function etat(controle) {
  if (controle.resultat === 'CONFORME') return { classe: 'is-ok', label: 'Conforme' }
  if (controle.resultat === 'NON_CONFORME') return { classe: 'is-ko', label: 'Non conforme' }
  return controle.disponible ? { classe: 'is-todo', label: 'À faire' } : { classe: 'is-later', label: 'À venir' }
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

  const tous = actions.flatMap((action) => action.controles)
  const compte = (classe) => tous.filter((item) => etat(item).classe === classe).length

  return (
    <section className="fiche-tab" data-fiche-tab="controles">
      <div className="fiche-tab__title">
        <h2>Contrôles d’efficacité</h2>
        <ul className="fiche-tab__compteurs" aria-label="Résumé des contrôles">
          <li className="is-ok">{compte('is-ok')} conforme{compte('is-ok') > 1 ? 's' : ''}</li>
          {compte('is-ko') > 0 && <li className="is-ko">{compte('is-ko')} non conforme{compte('is-ko') > 1 ? 's' : ''}</li>}
          {compte('is-todo') > 0 && <li className="is-todo">{compte('is-todo')} à faire</li>}
          {compte('is-later') > 0 && <li className="is-later">{compte('is-later')} à venir</li>}
        </ul>
      </div>
      <p className="fiche-tab__help">
        Chaque action réalisée est vérifiée à J+30, J+60 et J+90. Un contrôle non conforme déclenche une action corrective, revérifiée 30 jours plus tard.
      </p>
      <div className="controles">
        {actions.map((action) => (
          <article className="controles__ligne" data-action-id={action.id} key={action.id}>
            <div className="controles__action">
              <strong>{action.action_origine_id && <span className="fiche-tab__muted">Action corrective · </span>}{action.description}</strong>
              {action.critere_efficacite && <span className="fiche-tab__muted">On vérifie : {action.critere_efficacite}</span>}
            </div>
            <ol className="controles__jalons">
              {action.controles.map((item) => {
                const { classe, label } = etat(item)
                return (
                  <li className={`controles__jalon ${classe}`} key={item.id}>
                    <header>
                      <b>{JALONS[item.jalon]}</b>
                      <span className="controles__etat">{label}</span>
                    </header>
                    <span className="controles__date">{item.date_effective ? `Fait le ${formatDate(item.date_effective)}` : `Prévu le ${formatDate(item.date_echeance)}`}</span>
                    {item.commentaire && <span className="controles__constat" title={item.commentaire}>{item.commentaire}</span>}
                    {item.preuve && <span className="fiche-tab__muted">Preuve : {item.preuve}</span>}
                    {item.date_effective && <PreuveJointe compact fiche={fiche} objet="controle" objetId={item.id} />}
                    {item.disponible && fiche.droits.peut_enregistrer_controles && (
                      <Button size="small" type="button" onClick={() => setControle(item)}>Enregistrer le résultat</Button>
                    )}
                  </li>
                )
              })}
            </ol>
          </article>
        ))}
      </div>

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
