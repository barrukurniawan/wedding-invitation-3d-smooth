import assert from 'node:assert/strict'
import test from 'node:test'
import { evaluatePromo, promoCodes } from './promoCodes.js'

test('promoCodes: default THREADS=29999, env bisa ganti/mematikan', () => {
  assert.equal(promoCodes({}).get('THREADS'), 29999)
  assert.equal(promoCodes({ PROMO_CODES: '' }).size, 0)
  const m = promoCodes({ PROMO_CODES: 'threads=25000, TikTok=34999, rusak, X=abc' })
  assert.equal(m.get('THREADS'), 25000)
  assert.equal(m.get('TIKTOK'), 34999)
  assert.equal(m.size, 2)
})

test('evaluatePromo: huruf bebas, tolak bila sudah bayar / kode salah / tidak lebih murah', () => {
  assert.deepEqual(evaluatePromo(' threads ', { paid: false, currentAmount: 49999 }, {}), { ok: true, code: 'THREADS', price: 29999 })
  assert.equal(evaluatePromo('THREADS', { paid: true, currentAmount: 49999 }, {}).code, 'ALREADY_PAID')
  assert.equal(evaluatePromo('NGASAL', { paid: false, currentAmount: 49999 }, {}).code, 'PROMO_INVALID')
  assert.equal(evaluatePromo('THREADS', { paid: false, currentAmount: 29999 }, {}).code, 'PROMO_NOT_CHEAPER')
  assert.equal(evaluatePromo('THREADS', { paid: false, currentAmount: null }, {}).ok, true)
})
