import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_VENUE, VENUE_IDS, normalizeVenue } from './venues.js'

test('default venue is garden and listed', () => {
  assert.equal(DEFAULT_VENUE, 'garden')
  assert.ok(VENUE_IDS.includes(DEFAULT_VENUE))
})

test('normalizeVenue keeps known venues', () => {
  assert.equal(normalizeVenue('garden'), 'garden')
  assert.equal(normalizeVenue('beach'), 'beach')
})

test('normalizeVenue falls back to default for empty or unknown values', () => {
  for (const value of [undefined, null, '', 'ballroom', 'BEACH', 42]) {
    assert.equal(normalizeVenue(value), 'garden')
  }
})
