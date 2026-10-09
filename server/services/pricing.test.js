import assert from 'node:assert/strict'
import test from 'node:test'
import { pricingInfo } from './pricing.js'

const base = {
  PAYMENT_MODE: 'manual',
  INVITATION_PRICE_IDR: '0',
  PRICE_NORMAL_IDR: '299999',
  PRICE_AFTER_PROMO_IDR: '49999',
  PROMO_LABEL: 'Promo Peluncuran',
  PROMO_ENDS_AT: '2026-10-14T23:59:59+07:00',
  WHATSAPP_NUMBER: '0821-2212-6254',
}
const before = new Date('2026-10-09T00:00:00Z')
const after = new Date('2026-10-20T00:00:00Z')

test('promo active before the deadline exposes strikethrough and countdown', () => {
  const p = pricingInfo(base, before)
  assert.equal(p.isFree, true)
  assert.equal(p.currentPrice, 0)
  assert.equal(p.normalPrice, 299999)
  assert.equal(p.afterPromoPrice, 49999)
  assert.equal(p.promoActive, true)
  assert.equal(p.promoEndsAt, '2026-10-14T16:59:59.000Z')
  assert.equal(p.promoLabel, 'Promo Peluncuran')
})

test('promo hides itself after the deadline', () => {
  const p = pricingInfo(base, after)
  assert.equal(p.promoActive, false)
  assert.equal(p.normalPrice, null)
  assert.equal(p.promoEndsAt, null)
  assert.equal(p.currentPrice, 0)
})

test('no promo when normal price is missing or not higher than current', () => {
  assert.equal(pricingInfo({ ...base, PRICE_NORMAL_IDR: '' }, before).promoActive, false)
  assert.equal(pricingInfo({ ...base, INVITATION_PRICE_IDR: '299999' }, before).promoActive, false)
  assert.equal(pricingInfo({ ...base, PROMO_ENDS_AT: 'not a date' }, before).promoActive, false)
})

test('whatsapp number is normalized to digits only', () => {
  assert.equal(pricingInfo(base, before).whatsapp, '082122126254')
  assert.equal(pricingInfo({ ...base, WHATSAPP_NUMBER: '' }, before).whatsapp, null)
})

test('paid mode keeps the real price', () => {
  const p = pricingInfo({ ...base, INVITATION_PRICE_IDR: '49999' }, before)
  assert.equal(p.isFree, false)
  assert.equal(p.currentPrice, 49999)
  assert.equal(p.promoActive, true)
})
