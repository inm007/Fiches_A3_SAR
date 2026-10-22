import Badge from '../../ui/Badge.jsx'
import Icon from '../../ui/Icon.jsx'
import { Checkbox, Select, TextInput } from '../../ui/FormControls.jsx'
import { DOMAINES, MOC_STATUTS } from '../../../utils/constants.js'
import Astuce, { Pastilles } from './Astuce.jsx'
import CardsEditor from './CardsEditor.jsx'
import { CellInput, CellSelect } from './RowsEditor.jsx'
import { peopleOptions } from './options.js'
import './FicheSection.css'

const mocTone = { A_OUVRIR: 'warning', OUVERT: 'warning', CLOTURE: 'success' }

export default function Section07RisquesMoc({ draft, set, fiche, options, readOnly }) {
  const suiviMocSeulement = fiche.statut_etape === 'REALISATION_ACTIONS'
  const structureLocked = readOnly || suiviMocSeulement
  const codes = draft.domaines.map((domaine) => domaine.domaine)
  const domaineOptions = DOMAINES.map(([code, label]) => [code, label])
  const autres = draft.domaines.find((domaine) => domaine.domaine === 'AUTRES')

  const choisirDomaines = (choisis) => set('domaines', choisis.map((code) => draft.domaines.find((domaine) => domaine.domaine === code) ?? { domaine: code, valideur_role_code: '', precision: '' }))
  const changerAutres = (champ, valeur) => set('domaines', draft.domaines.map((domaine) => (domaine.domaine === 'AUTRES' ? { ...domaine, [champ]: valeur } : domaine)))

  // Un risque rattaché à un domaine coche ce domaine : son valideur sera sollicité.
  const changerRisques = (rows) => {
    set('risques', rows)
    const manquants = [...new Set(rows.map((row) => row.domaine).filter((code) => code && !codes.includes(code)))]
    if (manquants.length > 0) set('domaines', [...draft.domaines, ...manquants.map((code) => ({ domaine: code, valideur_role_code: '', precision: '' }))])
  }

  // Directeurs sollicités en même temps : la correspondance de l'écran Circuit de validation, plus celui choisi pour « Autres ».
  const valideurs = [...new Set(draft.domaines.flatMap((domaine) => (domaine.domaine === 'AUTRES'
    ? [options?.roles_valideurs?.find((role) => role.code === domaine.valideur_role_code)?.libelle ?? 'Directeur « Autres » à choisir']
    : options?.directeurs_par_domaine?.[domaine.domaine] ?? [])))]

  return (
    <div className="fiche-section">
      <Astuce ouvert={!readOnly && draft.domaines.length === 0} titre="Astuce : risques, MOC et valideurs">
        <ul>
          <li>Toute modification du procédé, d’un équipement, d’une protection, d’une procédure ou des conditions opératoires passe par un <strong>MOC</strong> (gestion du changement).</li>
          <li>Chaque domaine coché ajoute son ou ses directeurs au circuit du plan. Ils reçoivent la demande en même temps et doivent tous approuver. Ajouter un risque d’un domaine coche ce domaine.</li>
          <li>Pendant la réalisation, seul le suivi des MOC (référence, statut, preuve) reste modifiable.</li>
        </ul>
      </Astuce>

      <h3>Domaines concernés *</h3>
      <Pastilles label="Domaines concernés" options={domaineOptions} readOnly={structureLocked} value={codes} onChange={choisirDomaines} />
      {autres && (
        <div className="fiche-section__grid">
          <TextInput
            hint="Ex. : environnement, finances, informatique…"
            label="Préciser le domaine « Autres »"
            readOnly={structureLocked}
            required
            value={autres.precision}
            onChange={(valeur) => changerAutres('precision', valeur)}
          />
          <Select
            hint="La personne qui a ce profil reçoit la demande de validation."
            label="Directeur qui valide « Autres »"
            options={(options?.roles_valideurs ?? []).map((role) => [role.code, role.libelle])}
            readOnly={structureLocked}
            required
            value={autres.valideur_role_code}
            onChange={(code) => changerAutres('valideur_role_code', code)}
          />
        </div>
      )}

      <div className="fiche-section__kpi">
        <span className="fiche-section__kpi-label">Directeurs sollicités en même temps (tous doivent approuver)</span>
        {valideurs.length === 0 && <p className="fiche-section__muted">Cochez au moins un domaine.</p>}
        <ul className="fiche-section__list">
          {valideurs.map((libelle) => (
            <li key={libelle}>
              <Icon className="fiche-section__ok" name="check" size={15} />
              <span>{libelle}</span>
            </li>
          ))}
        </ul>
      </div>

      <h3>Risques et MOC</h3>
      <CardsEditor
        addLabel="Ajouter un risque"
        badges={(row) => row.moc_requis && <Badge tone={mocTone[row.moc_statut] ?? 'warning'}>MOC {MOC_STATUTS.find(([code]) => code === row.moc_statut)?.[1]?.toLowerCase() ?? 'à ouvrir'}</Badge>}
        canRemove={() => !structureLocked}
        emptyLabel="Aucun risque identifié."
        fields={[
          { key: 'description', label: 'Risque *', wide: true, render: (row, setRow) => <CellInput placeholder="Ex. : fuite vapeur pendant le remplacement" readOnly={structureLocked} value={row.description} onChange={(value) => setRow('description', value)} /> },
          { key: 'domaine', label: 'Domaine *', render: (row, setRow) => <CellSelect options={domaineOptions} readOnly={structureLocked} value={row.domaine} onChange={(value) => setRow('domaine', value)} /> },
          { key: 'responsable_id', label: 'Responsable', render: (row, setRow) => <CellSelect options={peopleOptions(options?.responsables)} readOnly={structureLocked} value={row.responsable_id} onChange={(value) => setRow('responsable_id', value)} /> },
          { key: 'mesure_maitrise', label: 'Mesure de maîtrise', wide: true, render: (row, setRow) => <CellInput readOnly={readOnly} value={row.mesure_maitrise} onChange={(value) => setRow('mesure_maitrise', value)} /> },
          { key: 'moc_requis', label: 'MOC', render: (row, setRow) => <Checkbox checked={row.moc_requis} label="Ce risque exige un MOC" readOnly={structureLocked} onChange={(value) => setRow('moc_requis', value)} /> },
          { key: 'moc_reference', label: 'Référence MOC', hidden: (row) => !row.moc_requis, render: (row, setRow) => <CellInput readOnly={readOnly} value={row.moc_reference} onChange={(value) => setRow('moc_reference', value)} /> },
          { key: 'moc_statut', label: 'Statut MOC', hidden: (row) => !row.moc_requis, render: (row, setRow) => <CellSelect options={MOC_STATUTS} readOnly={readOnly} value={row.moc_statut} onChange={(value) => setRow('moc_statut', value)} /> },
          { key: 'moc_preuve', label: 'Preuve de clôture du MOC', hidden: (row) => !row.moc_requis, render: (row, setRow) => <CellInput readOnly={readOnly} value={row.moc_preuve} onChange={(value) => setRow('moc_preuve', value)} /> },
        ]}
        newRow={structureLocked ? undefined : () => ({ domaine: draft.domaines[0]?.domaine ?? '', description: '', moc_requis: false, moc_reference: '', moc_statut: '', moc_preuve: '', mesure_maitrise: '', responsable_id: '' })}
        readOnly={readOnly}
        rows={draft.risques}
        title={(row, index) => row.description || `Risque ${index + 1}`}
        onChange={changerRisques}
      />
    </div>
  )
}
