import assert from 'node:assert/strict'
import test from 'node:test'
import { avecOption, cleOption, listOptions, mettreEnForme, optionsAutre, verifierOption } from '../src/components/fiche/sections/options.js'

const refs = {
  listes: {
    origine: [
      { id: 1, parent_id: null, code: 'AUDIT', libelle: 'Audit' },
      { id: 2, parent_id: null, code: 'AUTRE', libelle: 'Autre' },
      { id: 3, parent_id: 2, code: 'VISITE_CLIENT', libelle: 'Visite client' },
    ],
  },
}

test('la liste principale ne montre pas les options rangées sous « Autre »', () => {
  assert.deepEqual(listOptions(refs, 'origine', 'id'), [['1', 'Audit'], ['2', 'Autre']])
  const { autre, sousOptions } = optionsAutre(refs, 'origine')
  assert.equal(autre.id, 2)
  assert.deepEqual(sousOptions.map((valeur) => valeur.libelle), ['Visite client'])
})

test('une option créée s’ajoute une seule fois aux référentiels', () => {
  const option = { id: 4, parent_id: 2, code: 'REVUE_DIRECTION', libelle: 'Revue de direction' }
  const suivants = avecOption(refs, 'origine', option)
  assert.equal(suivants.listes.origine.length, 4)
  assert.equal(avecOption(suivants, 'origine', option), suivants)
})

test('la mise en forme suit celle des options existantes', () => {
  assert.equal(mettreEnForme('  visite   client. '), 'Visite client')
  assert.equal(mettreEnForme('écart de procédure ;'), 'Écart de procédure')
})

test('les doublons se repèrent sans accents, casse ni pluriel', () => {
  assert.equal(cleOption('Audits'), cleOption('audit'))
  assert.equal(cleOption('Retour d’expérience'), cleOption('retour d experience'))
  assert.equal(verifierOption('AUDITS', refs.listes.origine).doublon.id, 1)
})

test('les libellés trop courts ou trop vagues sont refusés', () => {
  assert.ok(verifierOption('ab').erreurs.length > 0)
  assert.ok(verifierOption('Divers').erreurs.length > 0)
  assert.deepEqual(verifierOption('Visite de sécurité').erreurs, [])
  assert.ok(verifierOption('INSPECTION REGLEMENTAIRE').conseils.length > 0)
})
