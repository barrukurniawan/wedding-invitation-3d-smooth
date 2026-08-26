import assert from 'node:assert/strict'
import test from 'node:test'
import { z } from 'zod'
import { RESERVED_SLUGS, SLUG_PATTERN, buildPublicUrl } from './host.js'
import { isFreeManualPackage } from './paymentConfig.js'

const createSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(SLUG_PATTERN, 'Slug undangan tidak valid.'),
  bride_name: z.string().trim().min(1).max(255).optional(),
  groom_name: z.string().trim().min(1).max(255).optional(),
  reception_at: z.string().trim().regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/,
    'Tanggal resepsi tidak valid.',
  ).optional(),
}).strict()

function calculateLifecycleDates(receptionIsoString) {
  const receptionDate = new Date(receptionIsoString)
  const expiresAt = new Date(receptionDate.getTime() + 7 * 24 * 60 * 60 * 1000)
  const retentionUntil = new Date(receptionDate.getTime() + 37 * 24 * 60 * 60 * 1000)
  return {
    receptionAt: receptionDate.toISOString().slice(0, 19).replace('T', ' '),
    expiresAt: expiresAt.toISOString().slice(0, 19).replace('T', ' '),
    retentionUntil: retentionUntil.toISOString().slice(0, 19).replace('T', ' '),
  }
}

function serializeInvitation(row) {
  return {
    id: Number(row.id),
    slug: row.slug,
    status: row.status,
    payment_proof_url: row.payment_proof_url || null,
    payment_submitted_at: row.payment_submitted_at ? String(row.payment_submitted_at).replace(' ', 'T') : null,
    reception_at: String(row.reception_at).replace(' ', 'T'),
    timezone: row.timezone || 'Asia/Jakarta',
    expires_at: String(row.expires_at).replace(' ', 'T'),
    retention_until: String(row.retention_until).replace(' ', 'T'),
    activated_at: row.activated_at ? String(row.activated_at).replace(' ', 'T') : null,
    rejection_reason: row.rejection_reason || null,
    public_url: buildPublicUrl(row.slug),
    config: row.bride_name == null ? null : {
      bride_name: row.bride_name,
      groom_name: row.groom_name,
      wedding_date: String(row.wedding_date).replace(' ', 'T'),
      resepsi_date: row.resepsi_date,
      resepsi_location: row.resepsi_location,
    },
  }
}

test('Invitation Creation: Schema accepts valid input and sanitizes casing/whitespace', () => {
  const result = createSchema.safeParse({
    slug: '  KIA-TONI2026  ',
    bride_name: 'Kia Anindya',
    groom_name: 'Toni Pratama',
    reception_at: '2026-11-20T10:00:00+07:00',
  })

  assert.equal(result.success, true)
  assert.equal(result.data.slug, 'kia-toni2026')
  assert.equal(result.data.bride_name, 'Kia Anindya')
  assert.equal(result.data.groom_name, 'Toni Pratama')
})

test('Invitation Creation: Schema rejects invalid slugs and malformed dates', () => {
  // Invalid slug with special characters
  const invalidSlug = createSchema.safeParse({ slug: 'kia&toni' })
  assert.equal(invalidSlug.success, false)

  // Invalid date format
  const invalidDate = createSchema.safeParse({
    slug: 'kia-toni',
    reception_at: '20-11-2026 10:00',
  })
  assert.equal(invalidDate.success, false)

  // Extra unauthorized fields
  const extraFields = createSchema.safeParse({
    slug: 'kia-toni',
    status: 'active', // Attempt to inject status
  })
  assert.equal(extraFields.success, false)
})

test('Invitation Creation: Reserved slug guard prevents overriding platform system routes', () => {
  for (const reserved of ['admin', 'api', 'app', 'dashboard', 'login', 'support', 'www']) {
    assert.equal(RESERVED_SLUGS.has(reserved), true)
  }
})

test('Invitation Creation: Lifecycle date computation (+7 days expiry, +37 days retention)', () => {
  const baseDate = '2026-08-01T10:00:00.000Z'
  const dates = calculateLifecycleDates(baseDate)

  assert.equal(dates.receptionAt, '2026-08-01 10:00:00')
  assert.equal(dates.expiresAt, '2026-08-08 10:00:00') // +7 days
  assert.equal(dates.retentionUntil, '2026-09-07 10:00:00') // +37 days
})

test('Invitation Creation: Initial state assignment distinguishes between free and paid modes', () => {
  // Free mode (price 0) initializes to active
  const freeInitialState = isFreeManualPackage({ PAYMENT_MODE: 'manual', INVITATION_PRICE_IDR: '0' })
    ? 'active'
    : 'draft'
  assert.equal(freeInitialState, 'active')

  // Paid mode (price > 0) initializes to draft
  const paidInitialState = isFreeManualPackage({ PAYMENT_MODE: 'manual', INVITATION_PRICE_IDR: '150000' })
    ? 'active'
    : 'draft'
  assert.equal(paidInitialState, 'draft')

  // Midtrans mode initializes to draft
  const midtransInitialState = isFreeManualPackage({ PAYMENT_MODE: 'midtrans', INVITATION_PRICE_IDR: '0' })
    ? 'active'
    : 'draft'
  assert.equal(midtransInitialState, 'draft')
})

test('Invitation Creation: Serialization formats invitation DTO accurately', () => {
  const rawDbRow = {
    id: 12,
    slug: 'kia-toni',
    status: 'active',
    payment_proof_url: '/api/my/proof/proof_123.jpg',
    payment_submitted_at: '2026-08-10 14:30:00',
    reception_at: '2026-11-15 11:00:00',
    timezone: 'Asia/Jakarta',
    expires_at: '2026-11-22 11:00:00',
    retention_until: '2026-12-22 11:00:00',
    activated_at: '2026-08-11 09:00:00',
    rejection_reason: null,
    bride_name: 'Kia',
    groom_name: 'Toni',
    wedding_date: '2026-11-15 08:00:00',
    resepsi_date: 'Minggu, 15 November 2026',
    resepsi_location: 'Grand Ballroom',
  }

  const dto = serializeInvitation(rawDbRow)
  assert.equal(dto.id, 12)
  assert.equal(dto.slug, 'kia-toni')
  assert.equal(dto.status, 'active')
  assert.equal(dto.payment_submitted_at, '2026-08-10T14:30:00')
  assert.equal(dto.reception_at, '2026-11-15T11:00:00')
  assert.equal(dto.config.bride_name, 'Kia')
  assert.equal(dto.config.wedding_date, '2026-11-15T08:00:00')
  assert.equal(dto.public_url.includes('kia-toni'), true)
})
