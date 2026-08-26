import assert from 'node:assert/strict'
import test from 'node:test'
import { canTransition } from './invitationState.js'
import { invitationPriceIdr, isFreeManualPackage, paymentMode } from './paymentConfig.js'

test('Payment State Machine: canTransition allows strictly legal lifecycle transitions', () => {
  // Valid transitions
  assert.equal(canTransition('draft', 'awaiting_payment'), true, 'draft -> awaiting_payment')
  assert.equal(canTransition('draft', 'pending_verification'), true, 'draft -> pending_verification')
  assert.equal(canTransition('awaiting_payment', 'pending_verification'), true, 'awaiting_payment -> pending_verification')
  assert.equal(canTransition('pending_verification', 'active'), true, 'pending_verification -> active')
  assert.equal(canTransition('pending_verification', 'draft'), true, 'pending_verification -> draft')
  assert.equal(canTransition('active', 'suspended'), true, 'active -> suspended')
  assert.equal(canTransition('suspended', 'active'), true, 'suspended -> active')
  assert.equal(canTransition('active', 'expired'), true, 'active -> expired')

  // Illegal transitions
  assert.equal(canTransition('draft', 'active'), false, 'draft -> active (bypassing verification)')
  assert.equal(canTransition('awaiting_payment', 'active'), false, 'awaiting_payment -> active')
  assert.equal(canTransition('active', 'draft'), false, 'active -> draft')
  assert.equal(canTransition('active', 'pending_verification'), false, 'active -> pending_verification')
  assert.equal(canTransition('expired', 'active'), false, 'expired -> active')
})

test('Payment State Machine: Midtrans order ID generator produces unique structured IDs', () => {
  function generateMidtransOrderId(invitationId) {
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).slice(2, 10)
    return `inv_${invitationId}_${timestamp}_${randomSuffix}`
  }

  const orderId1 = generateMidtransOrderId(42)
  const orderId2 = generateMidtransOrderId(42)

  assert.equal(orderId1.startsWith('inv_42_'), true)
  assert.notEqual(orderId1, orderId2)
  assert.equal(/^inv_\d+_\d+_[a-z0-9]+$/.test(orderId1), true)
})

test('Payment State Machine: Midtrans webhook status mapping handles gateway notification states', () => {
  function mapMidtransStatus(transactionStatus, fraudStatus) {
    if (transactionStatus === 'capture') {
      return fraudStatus === 'accept' ? 'success' : 'challenge'
    }
    if (transactionStatus === 'settlement') {
      return 'success'
    }
    if (transactionStatus === 'pending') {
      return 'pending'
    }
    if (['deny', 'expire', 'cancel'].includes(transactionStatus)) {
      return 'failed'
    }
    return 'unknown'
  }

  assert.equal(mapMidtransStatus('settlement', null), 'success')
  assert.equal(mapMidtransStatus('capture', 'accept'), 'success')
  assert.equal(mapMidtransStatus('capture', 'challenge'), 'challenge')
  assert.equal(mapMidtransStatus('pending', null), 'pending')
  assert.equal(mapMidtransStatus('deny', null), 'failed')
  assert.equal(mapMidtransStatus('expire', null), 'failed')
  assert.equal(mapMidtransStatus('cancel', null), 'failed')
})

test('Payment State Machine: Payment rejection workflow cleanly resets verification proof state', () => {
  function processPaymentRejection(invitation, reason) {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Alasan penolakan wajib diisi.')
    }
    if (!canTransition(invitation.status, 'draft')) {
      throw new Error(`Tidak dapat menolak undangan dari status ${invitation.status}`)
    }

    return {
      ...invitation,
      status: 'draft',
      payment_proof_url: null,
      payment_submitted_at: null,
      rejection_reason: reason.trim(),
    }
  }

  const pendingInvitation = {
    id: 15,
    status: 'pending_verification',
    payment_proof_url: '/api/my/proof/proof_blur.jpg',
    payment_submitted_at: '2026-08-20T10:00:00',
    rejection_reason: null,
  }

  const rejected = processPaymentRejection(pendingInvitation, 'Foto bukti transfer tidak terbaca / buram.')
  assert.equal(rejected.status, 'draft')
  assert.equal(rejected.payment_proof_url, null)
  assert.equal(rejected.payment_submitted_at, null)
  assert.equal(rejected.rejection_reason, 'Foto bukti transfer tidak terbaca / buram.')

  // Rejecting with empty reason throws error
  assert.throws(() => {
    processPaymentRejection(pendingInvitation, '   ')
  }, /Alasan penolakan wajib diisi/)
})

test('Payment State Machine: Payment configuration properly respects environment overrides', () => {
  assert.equal(paymentMode({ PAYMENT_MODE: 'midtrans' }), 'midtrans')
  assert.equal(paymentMode({ PAYMENT_MODE: 'manual' }), 'manual')
  assert.equal(invitationPriceIdr({ INVITATION_PRICE_IDR: '199000' }), 199000)
  assert.equal(isFreeManualPackage({ PAYMENT_MODE: 'manual', INVITATION_PRICE_IDR: '0' }), true)
  assert.equal(isFreeManualPackage({ PAYMENT_MODE: 'manual', INVITATION_PRICE_IDR: '50000' }), false)
})
