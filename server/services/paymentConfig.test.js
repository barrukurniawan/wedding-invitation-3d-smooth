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

test('price switches automatically to PRICE_AFTER_PROMO_IDR when the promo ends', async () => {
  const { invitationPriceIdr } = await import('./paymentConfig.js')
  const env = { INVITATION_PRICE_IDR: '0', PRICE_AFTER_PROMO_IDR: '49999', PROMO_ENDS_AT: '2026-10-16T23:59:59+07:00' }
  const friday = Date.parse('2026-10-16T23:59:58+07:00')
  const saturday = Date.parse('2026-10-17T00:00:00+07:00')
  assert.equal(invitationPriceIdr(env, friday), 0)
  assert.equal(invitationPriceIdr(env, saturday), 49999)
  assert.equal(invitationPriceIdr({ INVITATION_PRICE_IDR: '0', PROMO_ENDS_AT: env.PROMO_ENDS_AT }, saturday), 0)
  assert.equal(invitationPriceIdr({ INVITATION_PRICE_IDR: '10000' }, saturday), 10000)
})
