import { JALONS } from '../../utils/constants.js'
import { formatDate } from '../../utils/format.js'
import './FichePrintView.css'

const RESULTATS = { CONFORME: 'Conforme', NON_CONFORME: 'Non conforme' }
const ROLES = { PRINCIPAL: 'KPI principal', A_NE_PAS_DEGRADER: 'À ne pas dégrader', SUIVI: 'Suivi' }

function referenceLabel(refs, list, id) {
  return refs?.listes?.[list]?.find((item) => item.id === id)?.libelle ?? id
}

function display(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  if (Array.isArray(value)) return value.length ? value.map(display).join(', ') : '—'
  if (typeof value === 'object') return Object.values(value).filter(Boolean).map(display).join(' · ') || '—'
  return String(value)
}

function Section({ number, title, children }) {
  return (
    <section className="fiche-print__section">
      <h2><span>{String(number).padStart(2, '0')}</span>{title}</h2>
      {children}
    </section>
  )
}

function Fields({ values }) {
  return (
    <dl className="fiche-print__fields">
      {values.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{display(value)}</dd>
        </div>
      ))}
    </dl>
  )
}

function Table({ headers, rows }) {
  if (!rows.length) return <p className="fiche-print__empty">Aucune donnée renseignée.</p>
  return (
    <table>
      <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={row.id ?? index}>{row.values.map((value, cell) => <td key={cell}>{display(value)}</td>)}</tr>)}</tbody>
    </table>
  )
}

function FichePrintView({ fiche, refs, copie }) {
  const identification = fiche.identification
  const gains = fiche.gains

  return (
    <article className="fiche-print">
      <header className="fiche-print__header">
        <div>
          <p>Société Africaine de Raffinage · Amélioration continue</p>
          <h1>{fiche.titre}</h1>
          <strong>{fiche.numero_a3} · Boucle {fiche.version}</strong>
          {copie && <span>Copie figée du {new Date(copie.created_at).toLocaleDateString('fr-FR')} ({copie.evenement === 'CLOTURE' ? 'clôture' : 'soumission du plan'})</span>}
        </div>
        <div className="fiche-print__status">
          <b>{fiche.statut_etape_libelle}</b>
          <span>{fiche.confidentialite === 'RESTREINT' ? 'Restreint' : 'Normal'}</span>
        </div>
      </header>

      <div className="fiche-print__grid">
        <Section number={1} title="Identification">
          <Fields values={[
            ['Unité', identification.unite?.libelle],
            ['Équipement', identification.equipement?.libelle],
            ['Type d’amélioration', referenceLabel(refs, 'type_amelioration', identification.type_amelioration)],
            ['Origine', identification.origine?.libelle],
            ['Précision sur l’origine', identification.origine_precision],
            ['Avis SAP', identification.numero_avis_sap],
            ['Ordre SAP', identification.numero_ordre_sap],
            ['Sponsor', identification.sponsor?.nom ?? null],
            ['Date de lancement', identification.date_lancement],
            ['Date cible', identification.date_cible],
            ['Déclarant', fiche.declarant?.nom ?? null],
            ['Pilote', fiche.pilote?.nom ?? null],
          ]} />
        </Section>
        <Section number={2} title="Contexte, enjeu et problème">
          <Fields values={[
            ['Contexte', fiche.contexte.contexte],
            ['Énoncé du problème', fiche.contexte.enonce_probleme],
            ['Fréquence', referenceLabel(refs, 'frequence', fiche.contexte.frequence_id)],
            ['Impacts', fiche.contexte.impacts],
            ['Impact financier estimé', fiche.contexte.impact_financier_estime],
          ]} />
        </Section>
        <Section number={3} title="Situation actuelle">
          <Table headers={['Indicateur', 'Rôle', 'Unité', 'Référence', 'Cible', 'Actuelle', 'Source / période']} rows={fiche.indicateurs.map((item) => ({
            id: item.id,
            values: [item.libelle, ROLES[item.role] ?? null, item.unite_mesure, item.reference, item.cible, item.actuelle, [item.source, item.periode].filter(Boolean).join(' · ')],
          }))} />
        </Section>
        <Section number={4} title="Objectif">
          <Fields values={[
            ['Objectif SMART', fiche.objectif.objectif_smart],
            ['Périmètre', fiche.objectif.perimetre],
            ['Résultats attendus', fiche.objectif.resultats_attendus],
            ['Chef qui valide la pertinence', fiche.chef_pertinence?.nom ?? null],
            ['Équipe', (fiche.membres ?? []).map((membre) => membre.nom)],
          ]} />
        </Section>
        <Section number={5} title="Analyse des causes racines">
          <Fields values={[
            ['Méthode d’analyse', fiche.analyse.methode_analyse],
            ['Précision', fiche.analyse.methode_precision],
          ]} />
          <Table headers={['N°', 'Catégorie', 'Cause', 'Niveau', 'Racine', 'Preuve']} rows={fiche.analyse.causes.map((item) => ({
            id: item.id,
            values: [item.numero, item.categorie, item.libelle, item.niveau, item.racine, item.preuve],
          }))} />
        </Section>
        <Section number={6} title="Plan de contre-mesures">
          <Table headers={['Action', 'Type', 'Responsable', 'Échéance', 'Statut', 'Coût estimé', 'Critère d’efficacité']} rows={fiche.actions.map((item) => ({
            id: item.id,
            values: [item.description, item.type_action, item.responsable?.nom ?? null, item.echeance, item.statut_libelle, item.cout_estime, item.critere_efficacite],
          }))} />
        </Section>
        <Section number={7} title="Risques et MOC">
          <Fields values={[
            ['Domaines de validation', fiche.domaines.map((item) => item.valideur_role || item.domaine)],
          ]} />
          <Table headers={['Domaine', 'Risque', 'MOC requis', 'Référence', 'Statut MOC', 'Mesure de maîtrise']} rows={fiche.risques.map((item) => ({
            id: item.id,
            values: [item.domaine, item.description, item.moc_requis, item.moc_reference, item.moc_statut, item.mesure_maitrise],
          }))} />
        </Section>
        <Section number={8} title="Résultats après action">
          <Fields values={[
            ['Objectif atteint', fiche.resultats.objectif_atteint],
            ['Écart à l’objectif', fiche.resultats.ecart_objectif],
          ]} />
          <Table headers={['Indicateur', 'Cible', 'Après action', 'Date de mesure', 'Période de vérification']} rows={fiche.indicateurs.map((item) => ({
            id: item.id,
            values: [item.libelle, item.cible, item.apres, item.date_mesure_apres, item.periode_verification],
          }))} />
          {(fiche.maintien ?? []).some((jalon) => jalon.valeur !== null) && (
            <Table headers={['Maintien du KPI principal', 'Échéance', 'Valeur', 'Mesuré le', 'Commentaire']} rows={fiche.maintien.map((jalon) => ({
              id: jalon.jalon,
              values: [jalon.jalon.replace('J', 'J+'), formatDate(jalon.echeance), jalon.valeur, jalon.date_mesure ? formatDate(jalon.date_mesure) : null, jalon.commentaire],
            }))} />
          )}
        </Section>
        <Section number={9} title="Gains économiques">
          <Table headers={['Catégorie', 'Hypothèse', 'Montant annuel', 'Statut']} rows={gains.lignes.map((item) => ({
            id: item.id,
            values: [item.categorie_libelle, item.hypothese_calcul, item.montant_annuel, item.statut],
          }))} />
          <Fields values={[
            ['Sans gain chiffré', gains.sans_gain_chiffre],
            ['Coût de mise en œuvre', gains.cout_mise_en_oeuvre_b],
            ['Gains annuels enregistrés', gains.total_a],
            ['Gains annuels validés', gains.total_a_valide],
          ]} />
        </Section>
        <Section number={10} title="Standardisation et pérennisation">
          <Table headers={['Type', 'Responsable', 'Date', 'Statut', 'Preuve']} rows={fiche.perennisation.map((item) => ({
            id: item.id,
            values: [item.type_libelle, item.responsable?.nom ?? null, item.date, item.statut, item.preuve],
          }))} />
          <h3 className="fiche-print__subtitle">Contrôles d’efficacité J+30, J+60, J+90</h3>
          <Table headers={['Action', 'Contrôle', 'Échéance', 'Réalisé le', 'Résultat', 'Commentaire']} rows={fiche.actions.flatMap((action) => action.controles.map((controle) => ({
            id: controle.id,
            values: [action.description, JALONS[controle.jalon] ?? controle.jalon, formatDate(controle.date_echeance), controle.date_effective ? formatDate(controle.date_effective) : null, RESULTATS[controle.resultat] ?? 'À renseigner', controle.commentaire],
          })))} />
        </Section>
        <Section number={11} title="Leçons apprises">
          <Fields values={Object.entries(fiche.lecons).map(([rubrique, texte]) => [rubrique.replaceAll('_', ' '), texte])} />
        </Section>
        <Section number={12} title="Validation">
          <Table headers={['Porte', 'Rôle', 'Décision', 'Valideur', 'Demandée le', 'Décidée le', 'Commentaire']} rows={fiche.validations.map((item) => ({
            id: item.id,
            values: [item.porte, item.role?.libelle, item.decision, item.valideur?.nom ?? null, item.demandee_le, item.decidee_le, item.commentaire],
          }))} />
        </Section>
      </div>
      <footer className="fiche-print__footer">Document généré depuis SAR · Fiche A3 · {new Date().toLocaleDateString('fr-FR')}</footer>
    </article>
  )
}

export default FichePrintView
