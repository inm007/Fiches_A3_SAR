import { Select, TextInput } from '../../ui/FormControls.jsx'
import { ConfidentialiteBadge } from '../EtapeBadge.jsx'
import { listOptions, peopleOptions } from './options.js'
import './FicheSection.css'

export default function Section01Identification({ draft, set, fiche, refs, options, readOnly }) {
  const equipements = (refs?.equipements ?? [])
    .filter((equipement) => String(equipement.unite_id) === String(draft.unite_id))
    .map((equipement) => [String(equipement.id), `${equipement.code} — ${equipement.libelle}`])
  const origineAutre = refs?.listes?.origine?.find((valeur) => String(valeur.id) === String(draft.origine_id))?.code === 'AUTRE'

  return (
    <div className="fiche-section">
      <p className="fiche-section__help">Identifiez la fiche. Les références SAP sont saisies à la main.</p>
      <div className="fiche-section__grid">
        <TextInput label="N° A3" readOnly value={fiche.numero_a3} />
        <TextInput label="Titre" readOnly={readOnly} required value={draft.titre} onChange={(value) => set('titre', value)} />
        <Select label="Unité" options={(refs?.unites ?? []).map((unite) => [String(unite.id), unite.libelle])} readOnly={readOnly} required value={draft.unite_id} onChange={(value) => { set('unite_id', value); set('equipement_id', '') }} />
        <Select label="Équipement" options={equipements} readOnly={readOnly} value={draft.equipement_id} onChange={(value) => set('equipement_id', value)} />
        <TextInput hint="Saisie manuelle" label="N° d’avis SAP" readOnly={readOnly} value={draft.numero_avis_sap} onChange={(value) => set('numero_avis_sap', value)} />
        <TextInput hint="Saisie manuelle" label="N° d’ordre SAP" readOnly={readOnly} value={draft.numero_ordre_sap} onChange={(value) => set('numero_ordre_sap', value)} />
        <TextInput label="Pilote" readOnly value={fiche.pilote?.nom ?? 'Non désigné'} />
        <Select label="Sponsor" options={peopleOptions(options?.sponsors)} readOnly={readOnly} value={draft.sponsor_id} onChange={(value) => set('sponsor_id', value)} />
        <TextInput hint="Noms séparés par des virgules" label="Équipe" readOnly={readOnly} wide value={draft.equipe} onChange={(value) => set('equipe', value)} />
        <TextInput label="Date de lancement" readOnly={readOnly} type="date" value={draft.date_lancement} onChange={(value) => set('date_lancement', value)} />
        <TextInput label="Date cible" readOnly={readOnly} required type="date" value={draft.date_cible} onChange={(value) => set('date_cible', value)} />
        <Select label="Type d’amélioration" options={listOptions(refs, 'type_amelioration')} readOnly={readOnly} required value={draft.type_amelioration} onChange={(value) => set('type_amelioration', value)} />
        <Select label="Origine" options={listOptions(refs, 'origine', 'id')} readOnly={readOnly} required value={draft.origine_id} onChange={(value) => set('origine_id', value)} />
        {origineAutre && (
          <TextInput label="Précision de l’origine" readOnly={readOnly} required wide value={draft.origine_precision} onChange={(value) => set('origine_precision', value)} />
        )}
        <div className="sar-field">
          <span className="sar-field__label">Confidentialité</span>
          <ConfidentialiteBadge value={fiche.confidentialite} />
        </div>
      </div>
    </div>
  )
}
