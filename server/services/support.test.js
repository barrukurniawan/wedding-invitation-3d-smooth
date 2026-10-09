import assert from 'node:assert/strict'
import test from 'node:test'
import { MAX_MESSAGE_LENGTH, afterSchema, messageSchema, serializeMessage } from './support.js'

test('message body is trimmed and required', () => {
  assert.equal(messageSchema.parse({ body: '  halo  ' }).body, 'halo')
  assert.equal(messageSchema.safeParse({ body: '   ' }).success, false)
  assert.equal(messageSchema.safeParse({}).success, false)
})

test('message body has a maximum length', () => {
  assert.equal(messageSchema.safeParse({ body: 'a'.repeat(MAX_MESSAGE_LENGTH) }).success, true)
  assert.equal(messageSchema.safeParse({ body: 'a'.repeat(MAX_MESSAGE_LENGTH + 1) }).success, false)
})

test('unknown fields are rejected (user_id cannot be spoofed)', () => {
  assert.equal(messageSchema.safeParse({ body: 'hai', user_id: 2 }).success, false)
  assert.equal(messageSchema.safeParse({ body: 'hai', sender: 'admin' }).success, false)
})

test('after cursor defaults to 0 and rejects negatives', () => {
  assert.equal(afterSchema.parse({}).after, 0)
  assert.equal(afterSchema.parse({ after: '12' }).after, 12)
  assert.equal(afterSchema.safeParse({ after: '-1' }).success, false)
})

test('serializeMessage builds an ISO timestamp from epoch seconds', () => {
  const m = serializeMessage({ id: 5, sender: 'user', body: 'x', context: null, read_at: null, created_epoch: 1791500000 })
  assert.deepEqual(m, { id: 5, sender: 'user', body: 'x', context: null, read: false, created_at: new Date(1791500000 * 1000).toISOString() })
})
