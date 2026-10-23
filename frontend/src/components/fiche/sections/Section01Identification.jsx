import { Select, TextInput } from '../../ui/FormControls.jsx'
import { ConfidentialiteBadge } from '../EtapeBadge.jsx'
import EquipeFiche from '../EquipeFiche.jsx'
import Astuce from './Astuce.jsx'
import { listOptions, peopleOptions } from './options.js'
import './FicheSection.css'

export default function Section01Identification({ draft, set, fiche, refs, options, readOnly, onFicheChange }) {
  const equipements = (refs?.equipements ?? [])
    .filter((equipement) => String(equipement.unite_id) === String(draft.unite_id))
    .map((equipement) => [String(equipement.id), `${equipement.code} — ${equipement.libelle}`])
  const origineAutre = refs?.listes?.origine?.find((valeur) => String(valeur.id) === String(draft.origine_id))?.code === 'AUTRE'

  return (
    <div className="fiche-section">
      <Astuce ouvert={!readOnly && !draft.sponsor_id} titre="Astuce : qui porte la fiche ?">
        <ul>
          <li><strong>Déclarant</strong> : un agent ou un pilote. Quand un agent déclare, l’administrateur fonctionnel désigne un pilote de l’unité.</li>
          <li><strong>Pilote</strong> : il remplit les sections 1 à 4, choisit en section 4 le chef de département qui valide la pertinence, puis mène la fiche jusqu’à la clôture.</li>
          <li><strong>Sponsor</strong> : un directeur, choisi ici. Il soutient le sujet et donne l’accord final à la clôture (valider ou renvoyer).</li>
          <li><strong>Équipe</strong> : après la validation de la pertinence, le pilote ajoute des agents et des pilotes. Ils voient la fiche et renseignent l’analyse et le suivi.</li>
        </ul>
      </Astuce>

      <h3>La fiche</h3>
      <div className="fiche-section__grid">
        <TextInput label="N° A3" readOnly value={fiche.numero_a3} />
        <TextInput hint="Un titre court qui dit le problème, pas la solution." label="Titre" readOnly={readOnly} required value={draft.titre} onChange={(value) => set('titre', value)} />
        <Select label="Unité" options={(refs?.unites ?? []).map((unite) => [String(unite.id), unite.libelle])} readOnly={readOnly} required value={draft.unite_id} onChange={(value) => { set('unite_id', value); set('equipement_id', '') }} />
        <Select hint={draft.unite_id ? undefined : 'Choisissez d’abord l’unité.'} label="Équipement" options={equipements} readOnly={readOnly} value={draft.equipement_id} onChange={(value) => set('equipement_id', value)} />
        <Select label="Type d’amélioration" options={listOptions(refs, 'type_amelioration')} readOnly={readOnly} required value={draft.type_amelioration} onChange={(value) => set('type_amelioration', value)} />
        <Select label="Origine" options={listOptions(refs, 'origine', 'id')} readOnly={readOnly} required value={draft.origine_id} onChange={(value) => set('origine_id', value)} />
        {origineAutre && (
          <TextInput label="Précision de l’origine" readOnly={readOnly} required wide value={draft.origine_precision} onChange={(value) => set('origine_precision', value)} />
        )}
      </div>

      <h3>Les personnes</h3>
      <div className="fiche-section__grid">
        <Select
          hint="Un directeur : il soutient le sujet et donne l’accord final à la clôture."
          label="Sponsor"
          options={peopleOptions(options?.sponsors)}
          readOnly={readOnly}
          required
          value={draft.sponsor_id}
          onChange={(value) => set('sponsor_id', value)}
        />
      </div>
      {fiche.pertinence_validee_le && <EquipeFiche fiche={fiche} options={options} onChange={onFicheChange} />}

      <h3>Dates et références</h3>
      <div className="fiche-section__grid">
        <TextInput hint="Remplie automatiquement à la validation de la pertinence." label="Date de lancement" readOnly={readOnly} type="date" value={draft.date_lancement} onChange={(value) => set('date_lancement', value)} />
        <TextInput hint="Date à laquelle l’objectif doit être atteint." label="Date cible" readOnly={readOnly} required type="date" value={draft.date_cible} onChange={(value) => set('date_cible', value)} />
        <TextInput hint="Saisie manuelle" label="N° d’avis SAP" readOnly={readOnly} value={draft.numero_avis_sap} onChange={(value) => set('numero_avis_sap', value)} />
        <TextInput hint="Saisie manuelle" label="N° d’ordre SAP" readOnly={readOnly} value={draft.numero_ordre_sap} onChange={(value) => set('numero_ordre_sap', value)} />
        <div className="sar-field">
          <span className="sar-field__label">Confidentialité</span>
          <ConfidentialiteBadge value={fiche.confidentialite} />
        </div>
      </div>
    </div>
  )
}
