import assert from 'node:assert/strict'
import test from 'node:test'
import { Buffer } from 'node:buffer'
import { buildExcelArchive, matchesSearch } from '../src/utils/listTools.js'

function readStoredZip(bytes) {
  const archive = Buffer.from(bytes)
  const files = new Map()
  let offset = 0

  while (archive.readUInt32LE(offset) === 0x04034B50) {
    const nameLength = archive.readUInt16LE(offset + 26)
    const extraLength = archive.readUInt16LE(offset + 28)
    const contentLength = archive.readUInt32LE(offset + 18)
    const nameStart = offset + 30
    const contentStart = nameStart + nameLength + extraLength
    const name = archive.toString('utf8', nameStart, nameStart + nameLength)
    files.set(name, archive.toString('utf8', contentStart, contentStart + contentLength))
    offset = contentStart + contentLength
  }

  return files
}

test('recherche multi-termes sans tenir compte des accents ou de la casse', () => {
  assert.equal(matchesSearch(['Équipement', 'Maintenance préventive'], 'equipement PREVENTIVE'), true)
  assert.equal(matchesSearch(['Équipement', 'Maintenance préventive'], 'equipement corrective'), false)
})

test('génère un classeur Excel avec filtres, largeurs et valeurs protégées', () => {
  const archive = readStoredZip(buildExcelArchive([
    { label: 'Nom / unité', value: (row) => row.name },
    { label: 'Détail', value: (row) => row.detail },
  ], [{ name: 'Équipe <SAR>', detail: '=HYPERLINK formule en texte' }]))

  assert.deepEqual([...archive.keys()], [
    '[Content_Types].xml',
    '_rels/.rels',
    'xl/workbook.xml',
    'xl/_rels/workbook.xml.rels',
    'xl/styles.xml',
    'xl/worksheets/sheet1.xml',
  ])
  const sheet = archive.get('xl/worksheets/sheet1.xml')
  assert.match(sheet, /autoFilter ref="A1:B2"/)
  assert.match(sheet, /state="frozen"/)
  assert.match(sheet, /<col min="1" max="1" width="/)
  assert.match(sheet, /Équipe &lt;SAR&gt;/)
  assert.match(sheet, /=HYPERLINK formule en texte/)
  assert.doesNotMatch(sheet, /<f>/)
  assert.match(archive.get('xl/styles.xml'), /FFA51F2B/)
})
