import { useState } from 'react'
import Alert from '../../ui/Alert.jsx'
import Button from '../../ui/Button.jsx'
import Modal from '../../ui/Modal.jsx'
import { Select, TextInput } from '../../ui/FormControls.jsx'
import { describeError, ficheService } from '../../../services/ficheService.js'
import { toast } from '../../../utils/toast.js'
import { CellSelect } from './RowsEditor.jsx'
import { listOptions, optionsAutre, verifierOption } from './options.js'
import './ChampAutre.css'

const CREER = '__creer__'

/**
 * Liste de choix avec une valeur « Autre » : choisir « Autre » ouvre une seconde liste des options
 * déjà créées dessous, et permet d'en créer une nouvelle, enregistrée en base pour tout le monde.
 * `valueKey` : champ de la valeur stocké sur la fiche (code, id ou libellé selon la liste).
 * `variant="cell"` pour une carte de CardsEditor ; `sousErreur` s'affiche sous la seconde liste.
 */
export default function ChampAutre({ liste, refs, valueKey = 'code', value, onChange, onOptionCreee, readOnly, label, required, hint, error, sousErreur, variant = 'field' }) {
  const [creation, setCreation] = useState(false)
  const { autre, sousOptions } = optionsAutre(refs, liste)
  const cle = (valeur) => String(valeur[valueKey])
  const choisie = sousOptions.find((valeur) => cle(valeur) === String(value ?? ''))
  const autreActif = autre !== null && (choisie !== undefined || cle(autre) === String(value ?? ''))
  const principale = choisie ? cle(autre) : value
  // Une valeur enregistrée avant la liste administrable (ou retirée depuis) reste affichée.
  const connues = listOptions(refs, liste, valueKey)
  const principales = value && !(refs?.listes?.[liste] ?? []).some((valeur) => cle(valeur) === String(value)) ? [...connues, [String(value), String(value)]] : connues

  const sousListe = [...sousOptions.map((valeur) => [cle(valeur), valeur.libelle]), ...(readOnly ? [] : [[CREER, '+ Créer une nouvelle option…']])]
  const choisirSous = (choix) => {
    if (choix === CREER) setCreation(true)
    else onChange(choix || cle(autre))
  }
  const sousLibelle = `Précisez « ${autre?.libelle ?? 'Autre'} »`
  const sousPlaceholder = sousOptions.length > 0 ? 'Choisir une option…' : 'Aucune option : créez la première'

  const modale = creation && (
    <CreationOption
      autre={autre}
      label={label}
      liste={liste}
      refs={refs}
      onChoisir={(valeur) => { onChange(cle(valeur)); setCreation(false) }}
      onClose={() => setCreation(false)}
      onCreee={(valeur) => { onOptionCreee?.(liste, valeur); onChange(cle(valeur)); setCreation(false) }}
    />
  )

  if (variant === 'cell') {
    return (
      <div className="champ-autre">
        <CellSelect options={principales} readOnly={readOnly} value={principale} onChange={onChange} />
        {autreActif && <CellSelect options={sousListe} placeholder={sousPlaceholder} readOnly={readOnly} value={choisie ? cle(choisie) : ''} onChange={choisirSous} />}
        {modale}
      </div>
    )
  }

  return (
    <>
      <Select disabled={!refs} error={error} hint={hint} label={label} options={principales} readOnly={readOnly} required={required} value={principale} onChange={onChange} />
      {autreActif && (
        <Select
          error={sousErreur}
          hint={readOnly ? undefined : 'Absente de la liste ? Choisissez « Créer une nouvelle option ».'}
          label={sousLibelle}
          options={sousListe}
          placeholder={sousPlaceholder}
          readOnly={readOnly}
          required={required}
          value={choisie ? cle(choisie) : ''}
          onChange={choisirSous}
        />
      )}
      {modale}
    </>
  )
}

/** Fenêtre de création : la règle de nommage d'abord, puis la saisie contrôlée au fil de la frappe. */
function CreationOption({ liste, refs, label, autre, onCreee, onChoisir, onClose }) {
  const [saisie, setSaisie] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const valeurs = refs?.listes?.[liste] ?? []
  const exemples = valeurs.filter((valeur) => valeur.id !== autre.id).map((valeur) => valeur.libelle).slice(0, 8)
  const { libelle, erreurs, conseils, doublon } = verifierOption(saisie, valeurs)
  const tape = saisie.trim() !== ''

  const creer = async () => {
    setEnvoi(true)
    setErreur('')
    try {
      const resultat = await ficheService.creerOptionAutre(liste, libelle)
      toast.success(resultat.existait ? `« ${resultat.data.libelle} » existait déjà : elle est choisie.` : `Option « ${resultat.data.libelle} » créée sous « ${autre.libelle} ».`)
      onCreee(resultat.data)
    } catch (error) {
      const { message, manques } = describeError(error)
      setErreur(manques.join(' ') || message)
      setEnvoi(false)
    }
  }

  return (
    <Modal
      dirty={tape && !envoi}
      footer={({ requestClose }) => (
        <>
          <Button disabled={envoi} type="button" variant="secondary" onClick={requestClose}>Annuler</Button>
          <Button disabled={!tape || erreurs.length > 0 || doublon !== null} icon="plus" loading={envoi} loadingLabel="Création…" type="button" onClick={creer}>Créer l’option</Button>
        </>
      )}
      open
      size="md"
      subtitle={`${label} › ${autre.libelle}`}
      title="Créer une nouvelle option"
      onClose={onClose}
    >
      <div className="champ-autre__creation">
        <section className="champ-autre__regles" aria-label="Comment nommer l’option">
          <h3>Comment bien la nommer</h3>
          <ol>
            <li>Vérifiez d’abord qu’elle n’existe pas déjà dans la liste ou sous « {autre.libelle} ».</li>
            <li>Un nom court, de 1 à 4 mots : la catégorie, pas le détail de votre cas (le détail va dans la fiche).</li>
            <li>Une majuscule au début, le reste en minuscules, sauf les sigles (SAP, HSE).</li>
            <li>Au singulier, sans abréviation ni point final.</li>
          </ol>
          {exemples.length > 0 && (
            <div className="champ-autre__exemples">
              <span>Comme les options existantes :</span>
              {exemples.map((exemple) => <span className="champ-autre__exemple" key={exemple}>{exemple}</span>)}
            </div>
          )}
        </section>

        <TextInput autoFocus label="Nouvelle option" maxLength={80} required value={saisie} wide onChange={(valeur) => { setSaisie(valeur); setErreur('') }} />

        {tape && erreurs.length === 0 && !doublon && (
          <p className="champ-autre__apercu">Elle sera enregistrée ainsi : <strong>« {libelle} »</strong>, sous « {autre.libelle} ».</p>
        )}
        {tape && erreurs.length > 0 && <p className="fiche-section__warning">{erreurs.join(' ')}</p>}
        {doublon && (
          <div className="champ-autre__doublon">
            <span>« {doublon.libelle} » existe déjà{doublon.parent_id ? ` sous « ${autre.libelle} »` : ' dans la liste'}.</span>
            <Button size="small" type="button" variant="secondary" onClick={() => onChoisir(doublon)}>Choisir « {doublon.libelle} »</Button>
          </div>
        )}
        {tape && conseils.map((conseil) => <p className="champ-autre__conseil" key={conseil}>{conseil}</p>)}
        {erreur && <Alert severity="error">{erreur}</Alert>}

        <p className="fiche-section__help">L’option sera proposée sous « {autre.libelle} » à tous ceux qui remplissent une fiche. L’administrateur fonctionnel peut la renommer ou la retirer depuis Listes de choix.</p>
      </div>
    </Modal>
  )
}
