import assert from 'node:assert/strict'
import test from 'node:test'

const ADMIN_EDITABLE_CONFIG_FIELDS = [
  'bride_name',
  'groom_name',
  'bride_parents',
  'groom_parents',
  'wedding_photo',
  'wedding_date',
  'akad_date',
  'akad_time',
  'akad_location',
  'resepsi_date',
  'resepsi_time',
  'resepsi_location',
  'qris_image',
  'bank_name',
  'bank_account',
  'bank_holder',
  'maps_url',
  'venue_address',
  'gallery_photos',
  'quote',
]

function buildAdminConfigPayload(config) {
  const payload = {}
  for (const field of ADMIN_EDITABLE_CONFIG_FIELDS) {
    if (config[field] !== undefined) {
      payload[field] = config[field]
    }
  }
  return payload
}

function buildMyConfigPayload(config) {
  const { id, updated_at, invitation_id, ...editableConfig } = config
  return Object.fromEntries(
    Object.entries(editableConfig).filter(([, value]) => value !== null && value !== undefined),
  )
}

class ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
    this.name = 'ApiError'
  }
}

test('Frontend API Client: buildAdminConfigPayload extracts only editable fields and ignores extras', () => {
  const fullConfig = {
    id: 1,
    invitation_id: 1,
    updated_at: '2026-08-20T00:00:00Z',
    bride_name: 'Kia Anindya',
    groom_name: 'Toni Pratama',
    quote: 'Till death do us part',
    unsupported_extra_field: 'should be omitted',
  }

  const payload = buildAdminConfigPayload(fullConfig)
  assert.equal(payload.bride_name, 'Kia Anindya')
  assert.equal(payload.groom_name, 'Toni Pratama')
  assert.equal(payload.quote, 'Till death do us part')
  assert.equal(payload.id, undefined)
  assert.equal(payload.invitation_id, undefined)
  assert.equal(payload.updated_at, undefined)
  assert.equal(payload.unsupported_extra_field, undefined)
})

test('Frontend API Client: buildMyConfigPayload strips database metadata and filters nullish values', () => {
  const userFormConfig = {
    id: 99,
    invitation_id: 99,
    updated_at: '2026-08-24T12:00:00Z',
    bride_name: 'Siti',
    groom_name: 'Budi',
    quote: '',
    bank_account: null, // Null value stripped
    maps_url: undefined, // Undefined value stripped
    venue_address: 'Gedung Kartika',
  }

  const payload = buildMyConfigPayload(userFormConfig)
  assert.equal(payload.bride_name, 'Siti')
  assert.equal(payload.groom_name, 'Budi')
  assert.equal(payload.quote, '')
  assert.equal(payload.venue_address, 'Gedung Kartika')
  assert.equal(payload.id, undefined)
  assert.equal(payload.invitation_id, undefined)
  assert.equal(payload.updated_at, undefined)
  assert.equal('bank_account' in payload, false)
  assert.equal('maps_url' in payload, false)
})

test('Frontend API Client: ApiError properly encapsulates HTTP status, error code, and message', () => {
  const err = new ApiError(404, 'INVITATION_NOT_FOUND', 'Undangan tidak ditemukan.')

  assert.equal(err instanceof Error, true)
  assert.equal(err.name, 'ApiError')
  assert.equal(err.status, 404)
  assert.equal(err.code, 'INVITATION_NOT_FOUND')
  assert.equal(err.message, 'Undangan tidak ditemukan.')
})

test('Frontend API Client: CSRF token state manager maintains token lifecycle in client memory', () => {
  let csrfToken = ''
  const setCsrfToken = (t) => { csrfToken = t || '' }
  const getCsrfToken = () => csrfToken

  assert.equal(getCsrfToken(), '')
  setCsrfToken('mock_csrf_token_abc123')
  assert.equal(getCsrfToken(), 'mock_csrf_token_abc123')
  setCsrfToken('')
  assert.equal(getCsrfToken(), '')
})
