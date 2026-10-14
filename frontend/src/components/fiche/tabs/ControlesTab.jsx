import { useState } from 'react'
import Button from '../../common/Button.jsx'
import ConfirmDialog from '../../common/ConfirmDialog.jsx'
import StatusBadge from '../../common/StatusBadge.jsx'
import { Select, TextArea, TextInput } from '../../common/FormControls.jsx'
import { describeError, ficheService } from '../../../services/ficheService.js'
import { JALONS } from '../../../utils/constants.js'
import { formatDate } from '../../../utils/format.js'
import { toast } from '../../../utils/toast.js'
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
  const actions = fiche.actions.filter((action) => action.controles.length > 0)
  const set = (field) => (value) => setForm((current) => ({ ...current, [field]: value }))

  async function save() {
    setBusy(true)
    try {
      const corrective = form.resultat === 'NON_CONFORME'
        ? { description: form.description, echeance: form.echeance, responsable_id: form.responsable_id ? Number(form.responsable_id) : null }
        : null
      onChange(await ficheService.controle(controle.id, {
        resultat: form.resultat,
        commentaire: form.commentaire || null,
        preuve: form.preuve || null,
        ...(corrective ? { action_corrective: corrective } : {}),
      }))
      toast(`Contrôle ${JALONS[controle.jalon]} enregistré`)
      setControle(null)
      setForm(emptyForm)
    } catch (error) {
      setControle(null)
      onError(describeError(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="fiche-tab">
      <h2>Contrôles d’efficacité</h2>
      <p className="fiche-tab__help">
        Trois contrôles par action réalisée, à J+30, J+60 et J+90 de sa réalisation. Un contrôle non conforme exige une action corrective,
        vérifiée une fois à 30 jours (hypothèse D2). Tous doivent être conformes avant la clôture (B4).
      </p>
      {actions.length === 0 && <p className="fiche-tab__muted">Aucun contrôle : ils sont créés quand une action passe à « Réalisée ».</p>}
      {actions.map((action) => (
        <div key={action.id}>
          <h3>{action.action_origine_id ? 'Action corrective — ' : ''}{action.description}</h3>
          <div className="fiche-tab__grid">
            {action.controles.map((item) => {
              const [tone, label] = etat(item)
              return (
                <article className="fiche-tab__card" key={item.id}>
                  <header><strong>{JALONS[item.jalon]}</strong><StatusBadge tone={tone}>{label}</StatusBadge></header>
                  <span className="fiche-tab__muted">Échéance : {formatDate(item.date_echeance)}{item.date_effective && ` · fait le ${formatDate(item.date_effective)}`}</span>
                  {item.commentaire && <span>{item.commentaire}</span>}
                  {item.preuve && <span className="fiche-tab__muted">Preuve : {item.preuve}</span>}
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
        disabled={form.resultat === 'NON_CONFORME' && (!form.description.trim() || !form.echeance)}
        open={Boolean(controle)}
        title={controle ? `Contrôle ${JALONS[controle.jalon]}` : ''}
        variant="primary"
        onCancel={() => setControle(null)}
        onConfirm={save}
      >
        <Select label="Résultat" options={[['CONFORME', 'Conforme'], ['NON_CONFORME', 'Non conforme']]} required value={form.resultat} onChange={set('resultat')} />
        <TextArea label="Commentaire" value={form.commentaire} onChange={set('commentaire')} />
        <TextInput label="Preuve (référence)" value={form.preuve} onChange={set('preuve')} />
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
