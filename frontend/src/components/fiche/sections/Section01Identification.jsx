import { Select, TextInput } from '../../ui/FormControls.jsx'
import { ConfidentialiteBadge } from '../EtapeBadge.jsx'
import EquipeFiche from '../EquipeFiche.jsx'
import Astuce, { ListeNoms } from './Astuce.jsx'
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
          <li><strong>Initiateur</strong> : il remplit les sections 1 à 4 et les soumet à son chef de département, qui juge la pertinence de l’idée.</li>
          <li><strong>Pilote</strong> : la personne qui mène la fiche de bout en bout. Après la validation de la pertinence, la fiche part au pilote (ou au premier pilote qui la prend en charge s’ils sont plusieurs).</li>
          <li><strong>Sponsor</strong> : le responsable de la Direction qui soutient le sujet, débloque les moyens et donne l’accord final à la clôture.</li>
          <li><strong>Équipe</strong> : le pilote ajoute des membres, même d’une autre direction. Ils renseignent l’analyse et le suivi. Les participants sans compte s’ajoutent par leur nom.</li>
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
        <TextInput label="Pilote" readOnly value={fiche.pilote?.nom ?? 'Non désigné'} />
        <Select
          hint="Responsable Direction qui soutient le sujet et valide la clôture."
          label="Sponsor"
          options={peopleOptions(options?.sponsors)}
          readOnly={readOnly}
          value={draft.sponsor_id}
          onChange={(value) => set('sponsor_id', value)}
        />
        <ListeNoms
          hint="Ajoutez chaque personne puis appuyez sur Entrée."
          label="Participants sans compte"
          readOnly={readOnly}
          value={draft.equipe}
          onChange={(value) => set('equipe', value)}
        />
      </div>
      {fiche.pilote && <EquipeFiche fiche={fiche} options={options} onChange={onFicheChange} />}

      <h3>Dates et références</h3>
      <div className="fiche-section__grid">
        <TextInput hint="Remplie automatiquement au démarrage de l’analyse." label="Date de lancement" readOnly={readOnly} type="date" value={draft.date_lancement} onChange={(value) => set('date_lancement', value)} />
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
