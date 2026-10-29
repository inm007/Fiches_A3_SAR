import { useEffect, useState } from 'react'
import Badge from '../../ui/Badge.jsx'
import Button from '../../ui/Button.jsx'
import { Select } from '../../ui/FormControls.jsx'
import { DECISIONS, PORTES, SECTIONS } from '../../../utils/constants.js'
import { formatDate, formatDateTime } from '../../../utils/format.js'
import { ficheService } from '../../../services/ficheService.js'
import './FicheSection.css'

const decisionTone = { EN_ATTENTE: 'warning', VALIDE: 'success', REFUSE: 'error', ANNULE: 'neutral' }
const EVENEMENTS = { SOUMISSION_PLAN: 'Plan soumis en validation', CLOTURE: 'Fiche clôturée' }
const DECIDEURS = { 0: ' (chef de département)', 1: ' (directeurs)', 2: '' }

export default function Section12Validation({ fiche, onPrint }) {
  const [copies, setCopies] = useState(null)
  const [aImprimer, setAImprimer] = useState('actuelle')
  const signatures = fiche.validations.filter((validation) => validation.decision !== 'ANNULE')

  useEffect(() => {
    let actif = true
    ficheService.versions(fiche.id).then((data) => { if (actif) setCopies(data) }).catch(() => { if (actif) setCopies([]) })
    return () => { actif = false }
  }, [fiche.id, fiche.statut_etape])

  return (
    <div className="fiche-section">
      {onPrint && (
        <div className="fiche-section__impression">
          <div className="fiche-section__impression-texte">
            <strong>Imprimer la fiche A3</strong>
            <span>Choisissez « Enregistrer en PDF » dans la fenêtre d’impression pour obtenir un fichier.</span>
          </div>
          {(copies?.length ?? 0) > 0 && (
            <Select
              label="Version à imprimer"
              options={[['actuelle', 'La fiche telle qu’elle est aujourd’hui'], ...copies.map((copie) => [String(copie.id), `${EVENEMENTS[copie.evenement] ?? copie.evenement} · boucle ${copie.version} · ${formatDate(copie.created_at)}`])]}
              placeholder={null}
              value={aImprimer}
              onChange={setAImprimer}
            />
          )}
          <Button icon="pdf" type="button" onClick={() => onPrint(aImprimer === 'actuelle' ? null : copies.find((copie) => String(copie.id) === aImprimer))}>Imprimer</Button>
        </div>
      )}

      {fiche.motif_classement && (
        <p className="fiche-section__warning"><strong>Classée sans suite :</strong> {fiche.motif_classement}</p>
      )}

      {[0, 1, 2].map((porte) => {
        const lignes = signatures.filter((validation) => validation.porte === porte)
        return (
          <section className="fiche-section__group" key={porte}>
            <h3 className="fiche-section__group-title">Porte {porte} : {PORTES[porte]}{DECIDEURS[porte]}</h3>
            {lignes.length === 0 && <p className="fiche-section__muted">Pas encore demandée.</p>}
            <div className="fiche-section__signatures">
              {lignes.map((validation) => (
                <article className={`fiche-section__signature is-${validation.decision.toLowerCase()}`} key={validation.id}>
                  <header>
                    <strong>{validation.role?.libelle}</strong>
                    <Badge tone={decisionTone[validation.decision]}>{DECISIONS[validation.decision]}</Badge>
                  </header>
                  <span>{validation.valideur?.nom ?? '—'}</span>
                  <span className="fiche-section__muted">
                    {validation.decidee_le ? `Décidé le ${formatDate(validation.decidee_le)}` : `Demandé le ${formatDate(validation.demandee_le)}`} · boucle {validation.version_fiche}
                  </span>
                  {validation.section_concernee && (
                    <span className="fiche-section__muted">Section en cause : {validation.section_concernee}. {SECTIONS[validation.section_concernee - 1]}</span>
                  )}
                  {validation.commentaire && <q>{validation.commentaire}</q>}
                </article>
              ))}
            </div>
          </section>
        )
      })}
      <p><strong>Date de clôture :</strong> {formatDate(fiche.date_cloture)}</p>

      <section className="fiche-section__group">
        <h3 className="fiche-section__group-title">Copies figées</h3>
        <p className="fiche-section__help">Une copie de la fiche est gardée telle quelle à chaque soumission du plan et à la clôture : on retrouve ce qui a été validé, même après une nouvelle boucle. Pour en imprimer une, choisissez-la ci-dessus.</p>
        {copies === null && <p className="fiche-section__muted">Chargement…</p>}
        {copies?.length === 0 && <p className="fiche-section__muted">Aucune copie pour l’instant : la première est prise à la soumission du plan.</p>}
        <ul className="fiche-section__list">
          {copies?.map((copie) => (
            <li key={copie.id}>
              <span><strong>{EVENEMENTS[copie.evenement] ?? copie.evenement}</strong> · boucle {copie.version} · {formatDateTime(copie.created_at)} · {copie.auteur}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
