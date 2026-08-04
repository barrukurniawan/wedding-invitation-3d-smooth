import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeIndonesianPhone } from './phone.js'

test('normalizes supported Indonesian WhatsApp formats', () => {
  assert.equal(normalizeIndonesianPhone('0812 3456 7890'), '6281234567890')
  assert.equal(normalizeIndonesianPhone('+62 812-3456-7890'), '6281234567890')
  assert.equal(normalizeIndonesianPhone('6281234567890'), '6281234567890')
  assert.equal(normalizeIndonesianPhone('81234567890'), '6281234567890')
  assert.equal(normalizeIndonesianPhone('021123456'), null)
  assert.equal(normalizeIndonesianPhone('0812'), null)
})
