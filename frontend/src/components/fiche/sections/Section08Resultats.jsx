import Badge from '../../ui/Badge.jsx'
import Button from '../../ui/Button.jsx'
import { TextArea } from '../../ui/FormControls.jsx'
import { MAINTIEN_JALONS, OBJECTIF_ATTEINT } from '../../../utils/constants.js'
import { ameliorationPourcent, cibleTenue, ecart, objectifSuggere } from '../../../utils/a3Calculs.js'
import { formatDate, formatNumber, formatPercent } from '../../../utils/format.js'
import Astuce, { Pastilles } from './Astuce.jsx'
import CardsEditor from './CardsEditor.jsx'
import { CellInput } from './RowsEditor.jsx'
import './FicheSection.css'

const tenueBadge = (tenue) => {
  if (tenue === null || tenue === undefined) return null
  return tenue ? <Badge tone="success">Cible tenue</Badge> : <Badge tone="error">Cible non tenue</Badge>
}

export default function Section08Resultats({ draft, set, fiche, readOnly }) {
  const indicateurs = Object.fromEntries(fiche.indicateurs.map((indicateur) => [indicateur.id, indicateur]))
  const mesureOuverte = !readOnly && fiche.statut_etape !== 'VERIFICATION_MAINTIEN'
  const maintienOuvert = !readOnly && fiche.statut_etape === 'VERIFICATION_MAINTIEN'
  const principal = fiche.indicateurs.find((indicateur) => indicateur.principal)
  const apresPrincipal = draft.mesures.find((mesure) => mesure.indicateur_id === principal?.id)?.valeur
  const suggestion = principal ? objectifSuggere({ actuelle: principal.actuelle, cible: principal.cible, apres: apresPrincipal, sens: principal.sens }) : null
  const libelleObjectif = (code) => OBJECTIF_ATTEINT.find(([value]) => value === code)?.[1]
  const jalons = Object.fromEntries((fiche.maintien ?? []).map((jalon) => [jalon.jalon, jalon]))
  const setMaintien = (code, field, value) => set('maintien', draft.maintien.map((jalon) => (jalon.jalon === code ? { ...jalon, [field]: value } : jalon)))

  return (
    <div className="fiche-section">
      <Astuce ouvert={mesureOuverte && !draft.objectif_atteint} titre="Astuce : mesurer et vérifier">
        <ul>
          <li>Mesurez le KPI principal et les indicateurs à ne pas dégrader <strong>après</strong> les actions, dans les mêmes conditions que la valeur de départ.</li>
          <li>L’outil propose « objectif atteint » d’après la cible ; vous confirmez. Un objectif non atteint ne se clôture pas : lancez une nouvelle boucle.</li>
          <li>Le résultat doit ensuite <strong>tenir</strong> : vous remesurez le KPI principal à J+30, J+60 et J+90.</li>
        </ul>
      </Astuce>

      <h3>Mesure après action</h3>
      <CardsEditor
        badges={(row) => {
          const indicateur = indicateurs[row.indicateur_id]
          return (
            <>
              {indicateur?.principal && <Badge tone="brand">KPI principal</Badge>}
              {indicateur?.a_ne_pas_degrader && <Badge tone="warning">À ne pas dégrader</Badge>}
              {tenueBadge(cibleTenue(row.valeur, indicateur?.cible, indicateur?.sens))}
            </>
          )
        }}
        canRemove={() => false}
        emptyLabel="Aucun indicateur : ajoutez-les en section 3."
        fields={[
          { key: 'avant', label: 'Avant', render: (row) => <span className="cards-editor__value">{formatNumber(indicateurs[row.indicateur_id]?.actuelle)} {indicateurs[row.indicateur_id]?.unite_mesure}</span> },
          { key: 'cible', label: 'Cible', render: (row) => <span className="cards-editor__value">{formatNumber(indicateurs[row.indicateur_id]?.cible)} {indicateurs[row.indicateur_id]?.unite_mesure}</span> },
          { key: 'valeur', label: 'Après', render: (row, setRow) => <CellInput readOnly={!mesureOuverte} step="any" type="number" value={row.valeur} onChange={(value) => setRow('valeur', value)} /> },
          { key: 'ecart', label: 'Écart à la cible', render: (row) => {
            const indicateur = indicateurs[row.indicateur_id]
            return <span className="cards-editor__value">{formatNumber(ecart(row.valeur, indicateur?.cible ?? indicateur?.reference))}</span>
          } },
          { key: 'amelioration', label: 'Amélioration', render: (row) => {
            const indicateur = indicateurs[row.indicateur_id]
            const valeur = ameliorationPourcent(indicateur?.actuelle, row.valeur, indicateur?.sens)
            return <span className={`cards-editor__value${valeur === null ? '' : valeur >= 0 ? ' is-good' : ' is-bad'}`}>{row.valeur === '' ? '—' : formatPercent(valeur)}</span>
          } },
          { key: 'date_mesure', label: 'Date de mesure', render: (row, setRow) => <CellInput readOnly={!mesureOuverte} type="date" value={row.date_mesure} onChange={(value) => setRow('date_mesure', value)} /> },
          { key: 'periode_verification', label: 'Période observée', render: (row, setRow) => <CellInput placeholder="Ex. : semaines 12 à 15" readOnly={!mesureOuverte} value={row.periode_verification} onChange={(value) => setRow('periode_verification', value)} /> },
        ]}
        readOnly={readOnly}
        rows={draft.mesures}
        rowKey={(row) => row.indicateur_id}
        title={(row) => indicateurs[row.indicateur_id]?.libelle ?? 'Indicateur'}
        onChange={(rows) => set('mesures', rows)}
      />

      <h3>Objectif atteint ? *</h3>
      {mesureOuverte && suggestion && suggestion !== draft.objectif_atteint && (
        <div className="fiche-section__suggestion">
          <span>D’après la cible du KPI principal : <strong>{libelleObjectif(suggestion)}</strong>.</span>
          <Button size="small" type="button" variant="secondary" onClick={() => set('objectif_atteint', suggestion)}>Retenir « {libelleObjectif(suggestion)} »</Button>
        </div>
      )}
      <Pastilles
        label="Objectif atteint"
        options={OBJECTIF_ATTEINT}
        readOnly={!mesureOuverte}
        value={draft.objectif_atteint ? [draft.objectif_atteint] : []}
        onChange={(codes) => set('objectif_atteint', codes.filter((code) => code !== draft.objectif_atteint)[0] ?? '')}
      />
      {draft.objectif_atteint === 'NON' && (
        <p className="fiche-section__warning">Objectif non atteint : la fiche ne peut pas avancer vers la clôture. Utilisez « Nouvelle boucle » en haut de la fiche pour revoir l’analyse et le plan.</p>
      )}
      {draft.objectif_atteint === 'PARTIELLEMENT' && (
        <TextArea hint="Ce qui manque et ce que vous décidez : accepter l’écart avec la Direction, ou lancer une nouvelle boucle." label="Écart et suite donnée" readOnly={!mesureOuverte} required value={draft.ecart_objectif} onChange={(value) => set('ecart_objectif', value)} />
      )}

      {(fiche.date_resultats || fiche.statut_etape === 'VERIFICATION_MAINTIEN') && principal && (
        <>
          <h3>Maintien du résultat : {principal.libelle}</h3>
          <p className="fiche-section__help">
            Mesure Après validée le {formatDate(fiche.date_resultats)}. Remesurez le KPI principal à chaque échéance : la valeur doit rester
            {principal.sens === 'baisse' ? ' sous ' : ' au-dessus de '}{formatNumber(principal.cible)} {principal.unite_mesure}.
          </p>
          <div className="fiche-section__maintien">
            {MAINTIEN_JALONS.map(([code, label]) => {
              const jalon = jalons[code] ?? {}
              const saisie = draft.maintien.find((item) => item.jalon === code) ?? { valeur: '', date_mesure: '', commentaire: '' }
              const ouvert = maintienOuvert && jalon.disponible
              const tenue = cibleTenue(saisie.valeur, principal.cible, principal.sens)
              return (
                <article className="cards-editor__card" key={code}>
                  <header className="cards-editor__header">
                    <span className="cards-editor__title">{label}</span>
                    <span className="cards-editor__badges">
                      {saisie.valeur === '' ? <Badge tone={jalon.disponible ? 'warning' : 'neutral'}>{jalon.disponible ? 'À mesurer' : 'À venir'}</Badge> : tenueBadge(tenue)}
                    </span>
                  </header>
                  <span className="fiche-section__muted">Échéance : {formatDate(jalon.echeance)}</span>
                  <div className="cards-editor__fields">
                    <label className="cards-editor__field">
                      <span className="cards-editor__label">Valeur ({principal.unite_mesure})</span>
                      <input className="rows-editor__input" readOnly={!ouvert} step="any" type="number" value={saisie.valeur} onChange={(event) => setMaintien(code, 'valeur', event.target.value)} />
                    </label>
                    <label className="cards-editor__field">
                      <span className="cards-editor__label">Mesuré le</span>
                      <input className="rows-editor__input" readOnly={!ouvert} type="date" value={saisie.date_mesure} onChange={(event) => setMaintien(code, 'date_mesure', event.target.value)} />
                    </label>
                    <label className="cards-editor__field cards-editor__field--wide">
                      <span className="cards-editor__label">Commentaire</span>
                      <input className="rows-editor__input" readOnly={!ouvert} type="text" value={saisie.commentaire} onChange={(event) => setMaintien(code, 'commentaire', event.target.value)} />
                    </label>
                  </div>
                </article>
              )
            })}
          </div>
          {fiche.cloture_au_plus_tot && <p className="fiche-section__muted">La clôture pourra être soumise à partir du {formatDate(fiche.cloture_au_plus_tot)}.</p>}
        </>
      )}
    </div>
  )
}
