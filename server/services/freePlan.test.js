import assert from 'node:assert/strict'
import test from 'node:test'
import { freePlanForNewUser, isFreeForUser } from './freePlan.js'

const conn = (freePlan) => ({ query: async () => [[{ free_plan: freePlan }]] })

test('new accounts get the free plan only while the price is Rp0', () => {
  assert.equal(freePlanForNewUser({ INVITATION_PRICE_IDR: '0' }), 1)
  assert.equal(freePlanForNewUser({}), 1)
  assert.equal(freePlanForNewUser({ INVITATION_PRICE_IDR: '49999' }), 0)
})

test('price Rp0 is free for everyone', async () => {
  assert.equal(await isFreeForUser(1, conn(0), { INVITATION_PRICE_IDR: '0' }), true)
})

test('with a price, only accounts flagged free_plan stay free', async () => {
  const env = { INVITATION_PRICE_IDR: '49999' }
  assert.equal(await isFreeForUser(1, conn(1), env), true)
  assert.equal(await isFreeForUser(1, conn(0), env), false)
  assert.equal(await isFreeForUser(1, { query: async () => [[]] }, env), false)
})
