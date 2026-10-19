import assert from 'node:assert/strict'
import test from 'node:test'
import { describeError } from '../src/services/ficheService.js'

test('les erreurs métier conservent les emplacements de navigation du serveur', () => {
  const emplacement = {
    index: 0,
    type: 'section',
    section: 5,
    label: 'Ouvrir la section 5',
  }
  const error = describeError({
    status: 422,
    message: 'Le plan ne peut pas être soumis.',
    data: {
      manques: ['Section 5 : méthode d’analyse.'],
      emplacements: [emplacement],
    },
  })

  assert.deepEqual(error.manques, ['Section 5 : méthode d’analyse.'])
  assert.deepEqual(error.emplacements, [emplacement])
  assert.equal(error.conflict, false)
})
