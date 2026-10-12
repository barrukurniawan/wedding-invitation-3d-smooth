import assert from 'node:assert/strict'
import test from 'node:test'
import { publicGiftShipping } from './giftShipping.js'

test('no address means no gift section', () => {
  assert.equal(publicGiftShipping({}), null)
  assert.equal(publicGiftShipping({ gift_address: '   ', gift_recipient: 'A' }), null)
})

test('phone is hidden unless explicitly public', () => {
  const row = { gift_recipient: ' Rina ', gift_address: 'Jl. Melati 1\r\nBandung', gift_phone: '0812', gift_note: '' }
  assert.deepEqual(publicGiftShipping(row), { recipient: 'Rina', address: 'Jl. Melati 1\nBandung', phone: null, note: null })
  assert.equal(publicGiftShipping({ ...row, gift_phone_public: 1 }).phone, '0812')
  assert.equal(publicGiftShipping({ ...row, gift_phone_public: 0 }).phone, null)
})
