import { Checkbox } from '../../common/FormControls.jsx'
import { DOMAINES, MOC_STATUTS } from '../../../utils/constants.js'
import RowsEditor, { CellInput, CellSelect } from './RowsEditor.jsx'
import { peopleOptions } from './options.js'
import './FicheSection.css'

export default function Section07RisquesMoc({ draft, set, fiche, options, readOnly }) {
  const suiviMocSeulement = fiche.statut_etape === 'REALISATION_ACTIONS'
  const structureLocked = readOnly || suiviMocSeulement
  const coches = new Map(draft.domaines.map((domaine) => [domaine.domaine, domaine]))
  const toggle = (code, checked) => set('domaines', checked
    ? [...draft.domaines, { domaine: code, valideur_role_code: '' }]
    : draft.domaines.filter((domaine) => domaine.domaine !== code))
  const valideurs = [
    'Valideur Production / Exploitation (toujours en premier)',
    ...new Set(draft.domaines.map((domaine) => (domaine.domaine === 'AUTRES'
      ? (options?.roles_valideurs?.find((role) => role.code === domaine.valideur_role_code)?.libelle ?? 'Valideur « Autres » à choisir')
      : DOMAINES.find(([code]) => code === domaine.domaine)?.[2]))),
  ]
  const domaineOptions = DOMAINES.map(([code, label]) => [code, label])

  return (
    <div className="fiche-section">
      <div className="fiche-section__info">
        Toute modification touchant le procédé, les équipements, les protections, les procédures ou les conditions opératoires
        suit le processus de gestion du changement (MOC) et les exigences HSE et intégrité du site.
      </div>
      {suiviMocSeulement && !readOnly && (
        <p className="fiche-section__help">Pendant la réalisation, seul le suivi des MOC (référence, statut, preuve, mesure) est modifiable.</p>
      )}
      <h3>Domaines concernés *</h3>
      <div className="fiche-section__checks">
        {DOMAINES.map(([code, label]) => (
          <Checkbox key={code} checked={coches.has(code)} label={label} readOnly={structureLocked} onChange={(checked) => toggle(code, checked)} />
        ))}
      </div>
      {coches.has('AUTRES') && (
        <label className="sar-field">
          <span className="sar-field__label">Valideur du domaine « Autres »</span>
          <select
            disabled={structureLocked}
            value={coches.get('AUTRES').valideur_role_code ?? ''}
            onChange={(event) => set('domaines', draft.domaines.map((domaine) => (domaine.domaine === 'AUTRES' ? { ...domaine, valideur_role_code: event.target.value } : domaine)))}
          >
            <option value="">Choisir…</option>
            {(options?.roles_valideurs ?? []).map((role) => <option key={role.code} value={role.code}>{role.libelle}</option>)}
          </select>
        </label>
      )}
      <div className="fiche-section__info">
        <strong>Valideurs qui seront sollicités :</strong> {valideurs.filter(Boolean).join(' · ')}
      </div>
      <h3>Risques et MOC</h3>
      <RowsEditor
        addLabel="Ajouter un risque"
        columns={[
          { key: 'domaine', label: 'Domaine *', width: 130, render: (row, setRow) => <CellSelect options={domaineOptions} readOnly={structureLocked} value={row.domaine} onChange={(value) => setRow('domaine', value)} /> },
          { key: 'description', label: 'Description *', width: 200, render: (row, setRow) => <CellInput readOnly={structureLocked} value={row.description} onChange={(value) => setRow('description', value)} /> },
          { key: 'moc_requis', label: 'MOC', width: 50, render: (row, setRow) => <Checkbox checked={row.moc_requis} label="" readOnly={structureLocked} onChange={(value) => setRow('moc_requis', value)} /> },
          { key: 'moc_reference', label: 'Référence MOC', width: 120, render: (row, setRow) => <CellInput readOnly={readOnly} value={row.moc_reference} onChange={(value) => setRow('moc_reference', value)} /> },
          { key: 'moc_statut', label: 'Statut MOC', width: 110, render: (row, setRow) => <CellSelect options={MOC_STATUTS} readOnly={readOnly} value={row.moc_statut} onChange={(value) => setRow('moc_statut', value)} /> },
          { key: 'moc_preuve', label: 'Preuve de clôture', width: 130, render: (row, setRow) => <CellInput readOnly={readOnly} value={row.moc_preuve} onChange={(value) => setRow('moc_preuve', value)} /> },
          { key: 'mesure_maitrise', label: 'Mesure de maîtrise', width: 160, render: (row, setRow) => <CellInput readOnly={readOnly} value={row.mesure_maitrise} onChange={(value) => setRow('mesure_maitrise', value)} /> },
          { key: 'responsable_id', label: 'Responsable', width: 140, render: (row, setRow) => <CellSelect options={peopleOptions(options?.responsables)} readOnly={structureLocked} value={row.responsable_id} onChange={(value) => setRow('responsable_id', value)} /> },
        ]}
        emptyLabel="Aucun risque identifié."
        newRow={() => ({ domaine: draft.domaines[0]?.domaine ?? '', description: '', moc_requis: false, moc_reference: '', moc_statut: '', moc_preuve: '', mesure_maitrise: '', responsable_id: '' })}
        readOnly={structureLocked}
        rows={draft.risques}
        onChange={(rows) => set('risques', rows)}
      />
      {suiviMocSeulement && !readOnly && fiche.risques.length === 0 && <p className="fiche-section__muted">Aucun MOC à suivre.</p>}
    </div>
  )
}
