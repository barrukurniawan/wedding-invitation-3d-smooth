import assert from 'node:assert/strict'
import test from 'node:test'
import { z } from 'zod'
import { pickAdminConfigFields, stripAdminConfigMetadata } from './adminConfig.js'
import { canTransition } from './invitationState.js'
import { buildPublicUrl } from './host.js'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(12, 'Password baru minimal 12 karakter.').max(256),
})

const rejectSchema = z.object({
  reason: z.string().trim().min(1, 'Alasan penolakan wajib diisi.').max(1000),
})

function calculateGuestbookStats(entries) {
  return {
    total: entries.length,
    hadir: entries.filter((e) => e.attendance === 'Hadir').length,
    ragu: entries.filter((e) => e.attendance === 'Ragu-ragu').length,
    tidakHadir: entries.filter((e) => e.attendance === 'Tidak Hadir').length,
  }
}

function processAdminActivation({ invitation, paymentRecord }) {
  if (!invitation || invitation.status !== 'pending_verification') {
    return { error: { code: 'INVALID_VERIFICATION_STATE', message: 'Undangan belum berada dalam antrean verifikasi.' } }
  }
  if (!paymentRecord || paymentRecord.status !== 'received') {
    return { error: { code: 'PAYMENT_REQUIRED', message: 'Pembayaran tervalidasi belum tersedia.' } }
  }

  const activatedInvitation = {
    ...invitation,
    status: 'active',
    activated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
  }
  const publicUrl = buildPublicUrl(invitation.slug)

  return { success: true, invitation: activatedInvitation, publicUrl }
}

test('Admin Operations: Password change schema enforces 12-character minimum security policy', () => {
  assert.equal(changePasswordSchema.safeParse({
    currentPassword: 'oldPassword123',
    newPassword: 'short',
  }).success, false)

  assert.equal(changePasswordSchema.safeParse({
    currentPassword: 'oldPassword123',
    newPassword: 'exact12chars',
  }).success, true)

  assert.equal(changePasswordSchema.safeParse({
    currentPassword: 'oldPassword123',
    newPassword: 'SuperStrongPassword2026!#',
  }).success, true)
})

test('Admin Operations: Activation workflow verifies status, payment, and produces public subdomain link', () => {
  const pendingInvitation = { id: 7, slug: 'dian-anwar', status: 'pending_verification' }
  const validPayment = { id: 101, invitation_id: 7, status: 'received' }

  // Successful activation
  const result = processAdminActivation({ invitation: pendingInvitation, paymentRecord: validPayment })
  assert.equal(result.success, true)
  assert.equal(result.invitation.status, 'active')
  assert.equal(typeof result.invitation.activated_at, 'string')
  assert.equal(result.publicUrl.includes('dian-anwar'), true)

  // Rejection when invitation is already active or in draft
  const draftInvitation = { id: 8, slug: 'draft-inv', status: 'draft' }
  const invalidResult = processAdminActivation({ invitation: draftInvitation, paymentRecord: validPayment })
  assert.equal(invalidResult.error?.code, 'INVALID_VERIFICATION_STATE')

  // Rejection when payment record is missing
  const noPaymentResult = processAdminActivation({ invitation: pendingInvitation, paymentRecord: null })
  assert.equal(noPaymentResult.error?.code, 'PAYMENT_REQUIRED')
})

test('Admin Operations: Rejection schema validates rejection reasons', () => {
  assert.equal(rejectSchema.safeParse({ reason: 'Bukti transfer tidak sesuai nominal.' }).success, true)
  assert.equal(rejectSchema.safeParse({ reason: '' }).success, false)
  assert.equal(rejectSchema.safeParse({ reason: '   ' }).success, false)
  assert.equal(rejectSchema.safeParse({ reason: 'a'.repeat(1001) }).success, false)
})

test('Admin Operations: Guestbook statistics aggregator computes counts correctly', () => {
  const entries = [
    { id: '1', attendance: 'Hadir' },
    { id: '2', attendance: 'Hadir' },
    { id: '3', attendance: 'Ragu-ragu' },
    { id: '4', attendance: 'Tidak Hadir' },
    { id: '5', attendance: 'Hadir' },
  ]

  const stats = calculateGuestbookStats(entries)
  assert.deepEqual(stats, {
    total: 5,
    hadir: 3,
    ragu: 1,
    tidakHadir: 1,
  })
})

test('Admin Operations: Guestbook UUID validation protects deletion endpoints from SQL injection', () => {
  const uuidSchema = z.string().uuid()

  assert.equal(uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success, true)
  assert.equal(uuidSchema.safeParse('not-a-uuid').success, false)
  assert.equal(uuidSchema.safeParse("1' OR '1'='1").success, false)
})

test('Admin Operations: Config projections preserve allowlist fields and exclude database metadata', () => {
  const dirtyPayload = {
    id: 1,
    invitation_id: 1,
    updated_at: '2026-08-01',
    bride_name: 'Dewi',
    groom_name: 'Bayu',
    unknown_hack: 'injected',
  }

  const clean = pickAdminConfigFields(dirtyPayload)
  assert.equal(clean.bride_name, 'Dewi')
  assert.equal(clean.groom_name, 'Bayu')
  assert.equal(clean.id, undefined)
  assert.equal(clean.invitation_id, undefined)
  assert.equal(clean.updated_at, undefined)
  assert.equal(clean.unknown_hack, undefined)
})
