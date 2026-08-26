import assert from 'node:assert/strict'
import test from 'node:test'
import { parseTrackPayload } from './track.js'

test('Track Payload: accepts valid visitor beacon payloads', () => {
  const payload = parseTrackPayload({
    slug: 'kia-toni',
    path: '/',
    visitId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
    referrer: 'https://google.com/',
  })
  assert.equal(payload.slug, 'kia-toni')
  assert.equal(payload.path, '/')
  assert.equal(payload.visitId, '3f2504e0-4f89-11d3-9a0c-0305e82c3301')
  assert.equal(payload.referrer, 'https://google.com/')
})

test('Track Payload: allows null slug and referrer for root host pages', () => {
  const payload = parseTrackPayload({ slug: null, path: '/account', visitId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301', referrer: '' })
  assert.equal(payload.slug, null)
  assert.equal(payload.referrer, null)
  assert.equal(payload.path, '/account')
})

test('Track Payload: rejects non-UUID visit ids and invalid paths', () => {
  assert.equal(parseTrackPayload({ path: '/', visitId: 'not-a-uuid' }), null)
  assert.equal(parseTrackPayload({ path: 'javascript:alert(1)', visitId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' }), null)
  assert.equal(parseTrackPayload({ visitId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' }), null)
  assert.equal(parseTrackPayload(null), null)
  assert.equal(parseTrackPayload(undefined), null)
})

test('Track Payload: rejects reserved or malformed slugs', () => {
  assert.equal(
    parseTrackPayload({ slug: 'admin', path: '/', visitId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' }),
    null,
  )
  assert.equal(
    parseTrackPayload({ slug: '../etc/passwd', path: '/', visitId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' }),
    null,
  )
})
