import assert from 'node:assert/strict'
import test from 'node:test'
import { ameliorationPourcent, cibleTenue, ecart, objectifSuggere, proposerObjectif, totauxGains } from '../src/utils/a3Calculs.js'

test('écart et amélioration suivent les formules du serveur', () => {
  assert.equal(ecart('100', '80'), 20)
  assert.equal(ecart('', '80'), null)
  assert.equal(ameliorationPourcent(100, 75, 'baisse'), 25)
  assert.equal(ameliorationPourcent(100, 75, 'hausse'), -25)
  assert.equal(ameliorationPourcent(0, 75, 'hausse'), null)
})

test('la cible tenue dépend du sens souhaité', () => {
  assert.equal(cibleTenue(78, 80, 'baisse'), true)
  assert.equal(cibleTenue(82, 80, 'baisse'), false)
  assert.equal(cibleTenue(82, 80, 'hausse'), true)
  assert.equal(cibleTenue(null, 80, 'hausse'), null)
})

test('objectif proposé : oui, partiellement ou non', () => {
  assert.equal(objectifSuggere({ actuelle: 100, cible: 80, apres: 75, sens: 'baisse' }), 'OUI')
  assert.equal(objectifSuggere({ actuelle: 100, cible: 80, apres: 90, sens: 'baisse' }), 'PARTIELLEMENT')
  assert.equal(objectifSuggere({ actuelle: 100, cible: 80, apres: 104, sens: 'baisse' }), 'NON')
  assert.equal(objectifSuggere({ actuelle: 100, cible: 80, apres: '', sens: 'baisse' }), null)
})

test('totaux des gains : refusés exclus, retour sur investissement', () => {
  const totaux = totauxGains([
    { quantite: '4200', cout_unitaire: '2500', statut: 'PROPOSE' },
    { quantite: '10', cout_unitaire: '1000', statut: 'REFUSE' },
  ], '3200000')
  assert.deepEqual(totaux, { totalA: 10_500_000, coutB: 3_200_000, gainNet: 7_300_000, paybackAnnees: 0.3 })
  assert.equal(totauxGains([], 0).paybackAnnees, null)
})

test('objectif SMART proposé depuis le KPI principal', () => {
  assert.equal(
    proposerObjectif({ libelle: 'Consommation vapeur', unite_mesure: 't/h', sens: 'baisse', actuelle: '100', cible: '80' }, '2027-01-31'),
    'Réduire consommation vapeur de 100 t/h à 80 t/h d’ici le 31/01/2027, et tenir ce niveau trois mois.',
  )
  assert.equal(proposerObjectif({ libelle: 'Débit', cible: '' }), '')
})
