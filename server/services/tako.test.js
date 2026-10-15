import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'
import { mapTakoStatus, takoConfigured, verifyTakoSignature } from './tako.js'

// Contoh payload callback dari dokumentasi Tako.
const body = {
  event: 'payment.success',
  data: {
    id: '00000000-0000-0000-0000-000000000000',
    status: 'success',
    amount: 50000,
    price: 50000,
    paymentMethod: 'qris',
    paymentUrl: 'https://tako.id/pay/00000000-0000-0000-0000-000000000000',
    createdAt: '2026-07-02T10:30:00.000Z',
    relatedGiftId: null,
  },
}
const secret = 'rahasia-callback'
const sign = (payload) => createHmac('sha256', secret).update(payload).digest('hex')

test('signature over JSON.stringify(body) is accepted (documented method)', () => {
  assert.equal(verifyTakoSignature({ body, signature: sign(JSON.stringify(body)), secret }), true)
})

test('signature over the raw body is accepted even if formatting differs', () => {
  const rawBody = JSON.stringify(body, null, 2)
  assert.equal(verifyTakoSignature({ rawBody, body, signature: sign(rawBody), secret }), true)
})

test('wrong secret, tampered body, or malformed signature is rejected', () => {
  const good = sign(JSON.stringify(body))
  assert.equal(verifyTakoSignature({ body, signature: good, secret: 'lain' }), false)
  const tampered = { ...body, data: { ...body.data, amount: 1 } }
  assert.equal(verifyTakoSignature({ body: tampered, signature: good, secret }), false)
  for (const signature of [undefined, '', 'abc', good.slice(0, 10), `${good}00`]) {
    assert.equal(verifyTakoSignature({ body, signature, secret }), false, String(signature))
  }
  assert.equal(verifyTakoSignature({ body, signature: good, secret: '' }), false)
})

test('Tako statuses map to payment statuses; reversed/on_hold stay pending', () => {
  assert.equal(mapTakoStatus('success'), 'received')
  assert.equal(mapTakoStatus('failed'), 'failed')
  for (const s of ['pending', 'reversed', 'on_hold', undefined]) assert.equal(mapTakoStatus(s), 'pending')
})

test('takoConfigured needs both API key and username', () => {
  assert.equal(takoConfigured({}), false)
  assert.equal(takoConfigured({ TAKO_API_KEY: 'k' }), false)
  assert.equal(takoConfigured({ TAKO_API_KEY: 'k', TAKO_USERNAME: 'marryme' }), true)
})
