import assert from 'node:assert/strict'
import test from 'node:test'
import { toIsoString } from './dates.js'

test('Date becomes ISO, DATETIME string gets T, empty stays null', () => {
  assert.equal(toIsoString(new Date('2026-10-09T17:13:35Z')), '2026-10-09T17:13:35.000Z')
  assert.equal(toIsoString('2026-10-09 17:13:35'), '2026-10-09T17:13:35')
  assert.equal(toIsoString(null), null)
  assert.equal(toIsoString(''), null)
  assert.equal(toIsoString(new Date('x')), null)
})
