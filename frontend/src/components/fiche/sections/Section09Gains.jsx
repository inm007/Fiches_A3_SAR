import { Checkbox, TextInput } from '../../ui/FormControls.jsx'
import Badge from '../../ui/Badge.jsx'
import { STATUTS_GAIN } from '../../../utils/constants.js'
import { formatFcfa, formatNumber } from '../../../utils/format.js'
import Astuce from './Astuce.jsx'
import CardsEditor from './CardsEditor.jsx'
import ChampAutre from './ChampAutre.jsx'
import { CellInput } from './RowsEditor.jsx'
import './FicheSection.css'

const gainTone = { PROPOSE: 'neutral', VALIDE: 'success', REFUSE: 'error' }

export default function Section09Gains({ draft, set, fiche, refs, readOnly, onOptionCreee }) {

  return (
    <div className="fiche-section">
      <Astuce ouvert={!readOnly && draft.gains.length === 0 && !draft.sans_gain_chiffre} titre="Astuce : chiffrer les gains">
        <ul>
          <li>Un gain par nature : production récupérée, énergie économisée, maintenance évitée… Écrivez l’hypothèse pour que le Contrôle de gestion puisse la vérifier.</li>
          <li>Saisissez directement le montant annuel en FCFA : l’application ne fait aucun calcul.</li>
          <li>Comme sur la fiche papier, indiquez ensuite le gain net annuel (gains moins coût de mise en œuvre) et le délai de retour en mois, calculés par vos soins.</li>
          <li>Pas de gain chiffrable (sécurité, conformité) ? Cochez « sans gain chiffré » : seul le directeur sponsor validera la clôture.</li>
        </ul>
      </Astuce>

      <Checkbox checked={draft.sans_gain_chiffre} label="Sans gain chiffré (le Contrôle de gestion n’est pas sollicité)" readOnly={readOnly || draft.gains.length > 0} onChange={(value) => set('sans_gain_chiffre', value)} />
      {!draft.sans_gain_chiffre && (
        <CardsEditor
          addLabel="Ajouter un gain"
          badges={(row) => <Badge tone={gainTone[row.statut ?? 'PROPOSE']}>{STATUTS_GAIN[row.statut ?? 'PROPOSE']}</Badge>}
          canRemove={(row) => row.statut !== 'VALIDE'}
          emptyLabel="Aucun gain chiffré."
          fields={[
            { key: 'categorie', label: 'Nature du gain *', render: (row, setRow, _, locked) => <ChampAutre label="Nature du gain" liste="categorie_gain" readOnly={locked} refs={refs} value={row.categorie} variant="cell" onChange={(value) => setRow('categorie', value)} onOptionCreee={onOptionCreee} /> },
            { key: 'hypothese_calcul', label: 'Hypothèse *', wide: true, render: (row, setRow, _, locked) => <CellInput placeholder="Ex. : 20 t/h de vapeur économisées sur 8 400 h/an" readOnly={locked} value={row.hypothese_calcul} onChange={(value) => setRow('hypothese_calcul', value)} /> },
            { key: 'montant_annuel', label: 'Montant annuel (FCFA) *', render: (row, setRow, _, locked) => <CellInput min="0" readOnly={locked} type="number" value={row.montant_annuel} onChange={(value) => setRow('montant_annuel', value)} /> },
          ]}
          locked={(row) => row.statut === 'VALIDE'}
          lockedLabel={() => 'Gain validé par le Contrôle de gestion : il ne se modifie plus.'}
          newRow={() => ({ categorie: '', hypothese_calcul: '', montant_annuel: '', statut: 'PROPOSE' })}
          readOnly={readOnly}
          rows={draft.gains}
          title={(row, index) => refs?.listes?.categorie_gain?.find((valeur) => valeur.code === row.categorie)?.libelle ?? `Gain ${index + 1}`}
          onChange={(rows) => set('gains', rows)}
        />
      )}
      <div className="fiche-section__grid">
        <TextInput
          hint={`Facultatif, saisi à la main. Pour mémoire, coût estimé des actions : ${formatFcfa(fiche.gains.cout_actions)}.`}
          label="Coût de mise en œuvre (FCFA)"
          min="0"
          readOnly={readOnly}
          type="number"
          value={draft.cout_mise_en_oeuvre_b}
          onChange={(value) => set('cout_mise_en_oeuvre_b', value)}
        />
        {!draft.sans_gain_chiffre && (
          <>
            <TextInput
              hint="Saisi à la main : gains annuels moins coût de mise en œuvre."
              label="Gain net annuel (FCFA)"
              readOnly={readOnly}
              type="number"
              value={draft.gain_net_annuel}
              onChange={(value) => set('gain_net_annuel', value)}
            />
            <TextInput
              hint="Saisi à la main : temps pour que les gains remboursent le coût."
              label="Délai de retour, payback (mois)"
              min="0"
              readOnly={readOnly}
              step="0.1"
              type="number"
              value={draft.payback_mois}
              onChange={(value) => set('payback_mois', value)}
            />
          </>
        )}
      </div>
      <div className="fiche-section__totaux">
        <div className="fiche-section__total"><span>Gains annuels enregistrés (hors refusés)</span><strong>{formatFcfa(fiche.gains.total_a)}</strong></div>
        <div className="fiche-section__total"><span>Gains validés par le Contrôle de gestion</span><strong>{formatFcfa(fiche.gains.total_a_valide)}</strong></div>
        {!fiche.gains.sans_gain_chiffre && (
          <>
            <div className="fiche-section__total"><span>Gain net annuel</span><strong>{fiche.gains.gain_net_annuel === null ? 'Non renseigné' : formatFcfa(fiche.gains.gain_net_annuel)}</strong></div>
            <div className="fiche-section__total"><span>Délai de retour</span><strong>{fiche.gains.payback_mois === null ? 'Non renseigné' : `${formatNumber(fiche.gains.payback_mois)} mois`}</strong></div>
          </>
        )}
      </div>
      <p className="fiche-section__muted">Seuls les gains validés entrent dans les indicateurs officiels.</p>
    </div>
  )
}
