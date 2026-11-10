import assert from 'node:assert/strict'
import test from 'node:test'
import { eventTitles } from './eventTitles.js'

test('eventTitles: bawaan Akad Nikah & Resepsi', () => {
  assert.deepEqual(eventTitles({}), { first: 'Akad Nikah', second: 'Resepsi', secondEnabled: true, placeTitle: 'Akad & Resepsi', firstShort: 'Akad' })
  assert.equal(eventTitles({ akad_title: null, resepsi_title: '  ', resepsi_enabled: 1 }).placeTitle, 'Akad & Resepsi')
})

test('eventTitles: Pemberkatan saja (acara kedua dimatikan)', () => {
  const t = eventTitles({ akad_title: ' Pemberkatan ', resepsi_enabled: 0 })
  assert.equal(t.first, 'Pemberkatan')
  assert.equal(t.secondEnabled, false)
  assert.equal(t.placeTitle, 'Pemberkatan')
})

test('eventTitles: dua nama khusus, dipotong 60 karakter', () => {
  const t = eventTitles({ akad_title: 'Pemberkatan', resepsi_title: 'Ramah   Tamah', resepsi_enabled: '1' })
  assert.equal(t.placeTitle, 'Pemberkatan & Ramah Tamah')
  assert.equal(eventTitles({ akad_title: 'x'.repeat(80) }).first.length, 60)
})
