import assert from 'node:assert/strict'
import test from 'node:test'
import { apiErrorMessage } from '../src/auth/api.js'

test('les erreurs techniques sont affichées en français', () => {
  assert.match(apiErrorMessage(0, null), /Impossible de joindre le serveur/)
  assert.match(apiErrorMessage(500, { message: 'Server Error' }), /Le serveur a rencontré une erreur/)
  assert.equal(apiErrorMessage(403, { message: 'This action is unauthorized.' }), 'Vous n’êtes pas autorisé à effectuer cette action.')
  assert.equal(apiErrorMessage(401, { message: 'Unauthenticated.' }), 'Votre session a expiré. Reconnectez-vous.')
})

test('le message métier du serveur est conservé', () => {
  assert.equal(apiErrorMessage(422, { message: 'Le champ titre est obligatoire.' }), 'Le champ titre est obligatoire.')
  assert.equal(apiErrorMessage(404, null, 'Fiche introuvable.'), 'Fiche introuvable.')
})
