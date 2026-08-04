import assert from 'node:assert/strict'
import test from 'node:test'
import { invitationPriceIdr, isFreeManualPackage, paymentMode } from './paymentConfig.js'

test('recognizes the manual free package only for exact zero pricing', () => {
  assert.equal(paymentMode({ PAYMENT_MODE: 'manual' }), 'manual')
  assert.equal(invitationPriceIdr({ INVITATION_PRICE_IDR: '0' }), 0)
  assert.equal(isFreeManualPackage({ PAYMENT_MODE: 'manual', INVITATION_PRICE_IDR: '0' }), true)
  assert.equal(isFreeManualPackage({ PAYMENT_MODE: 'manual', INVITATION_PRICE_IDR: '150000' }), false)
  assert.equal(isFreeManualPackage({ PAYMENT_MODE: 'midtrans', INVITATION_PRICE_IDR: '0' }), false)
})
