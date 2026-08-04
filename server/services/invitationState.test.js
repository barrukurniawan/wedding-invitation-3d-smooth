import assert from 'node:assert/strict'
import test from 'node:test'
import { canTransition } from './invitationState.js'

test('allows only the payment and verification transitions', () => {
  assert.equal(canTransition('draft', 'awaiting_payment'), true)
  assert.equal(canTransition('draft', 'pending_verification'), true)
  assert.equal(canTransition('awaiting_payment', 'pending_verification'), true)
  assert.equal(canTransition('pending_verification', 'active'), true)
  assert.equal(canTransition('pending_verification', 'draft'), true)
  assert.equal(canTransition('draft', 'active'), false)
  assert.equal(canTransition('awaiting_payment', 'active'), false)
  assert.equal(canTransition('active', 'draft'), false)
})
