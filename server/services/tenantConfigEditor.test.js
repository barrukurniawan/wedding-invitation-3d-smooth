import assert from 'node:assert/strict'
import test from 'node:test'
import { z } from 'zod'
import { normalizeMusicConfig } from './configDefaults.js'

const text = (max) => z.string().trim().max(max)
const weddingDate = z.union([
  z.string().trim().regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/,
    'Tanggal pernikahan tidak valid.',
  ).refine((val) => {
    const todayWib = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10)
    return val.slice(0, 10) >= todayWib
  }, {
    message: 'Tanggal pernikahan tidak boleh di masa lalu (sebelum hari ini).',
  }),
  z.literal(''),
  z.null(),
])

const configSchema = z.object({
  bride_name: text(255),
  groom_name: text(255),
  bride_parents: text(255),
  groom_parents: text(255),
  wedding_photo: text(2048),
  wedding_date: weddingDate,
  akad_date: text(255),
  akad_time: text(255),
  akad_location: text(255),
  resepsi_date: text(255),
  resepsi_time: text(255),
  resepsi_location: text(255),
  qris_image: text(2048),
  bank_name: text(100),
  bank_account: text(100),
  bank_holder: text(255),
  maps_url: text(2048),
  venue_address: text(2000),
  quote: text(2000),
  gallery_photos: z.array(text(2048)).max(30),
  bgm_url: text(2048),
  bgm_title: text(255),
  preset: z.enum(['3d_summer', '2d_garden']),
  slug: z.string().optional(),
}).partial().passthrough()

function serializeConfig(config) {
  const result = normalizeMusicConfig({ ...config })
  result.id = Number(result.invitation_id || result.id)
  result.gallery_photos = typeof result.gallery_photos === 'string'
    ? JSON.parse(result.gallery_photos)
    : result.gallery_photos || []
  if (result.wedding_date) {
    result.wedding_date = String(result.wedding_date).replace(' ', 'T')
  } else {
    result.wedding_date = ''
  }
  return result
}

test('Tenant Config Editor: Schema accepts valid partial updates for bride and groom', () => {
  const payload = {
    bride_name: 'Siti Rahma',
    groom_name: 'Budi Santoso',
    bride_parents: 'Bpk. Ahmad & Ibu. Maryam',
    groom_parents: 'Bpk. Hendra & Ibu. Ratna',
  }

  const result = configSchema.safeParse(payload)
  assert.equal(result.success, true)
  assert.deepEqual(result.data, payload)
})

test('Tenant Config Editor: Schema validates event details and ISO wedding date', () => {
  const validEvent = {
    wedding_date: '2026-10-25T09:00:00+07:00',
    akad_date: 'Minggu, 25 Oktober 2026',
    akad_time: '08:00 - 10:00 WIB',
    akad_location: 'Masjid Agung',
    resepsi_date: 'Minggu, 25 Oktober 2026',
    resepsi_time: '11:00 - 14:00 WIB',
    resepsi_location: 'Balai Samudera',
  }

  const result = configSchema.safeParse(validEvent)
  assert.equal(result.success, true)

  const invalidDate = configSchema.safeParse({ wedding_date: '25-10-2026 09:00' })
  assert.equal(invalidDate.success, false)

  const pastDate = configSchema.safeParse({ wedding_date: '2020-01-01T08:00:00' })
  assert.equal(pastDate.success, false)
  assert.match(pastDate.error.issues[0].message, /masa lalu/)
})

test('Tenant Config Editor: Schema validates digital envelope and banking info', () => {
  const validBank = {
    bank_name: 'Bank Mandiri',
    bank_account: '1400012345678',
    bank_holder: 'Budi Santoso',
    qris_image: 'https://marryme.web.id/api/public/photos/qris_sample.png',
  }

  const result = configSchema.safeParse(validBank)
  assert.equal(result.success, true)
  assert.equal(result.data.bank_name, 'Bank Mandiri')
})

test('Tenant Config Editor: Enforces maximum 30 photos limit in gallery array', () => {
  const exactly30Photos = Array.from({ length: 30 }, (_, i) => `/api/public/photos/photo_${i}.jpg`)
  assert.equal(configSchema.safeParse({ gallery_photos: exactly30Photos }).success, true)

  const overLimit31Photos = Array.from({ length: 31 }, (_, i) => `/api/public/photos/photo_${i}.jpg`)
  const overResult = configSchema.safeParse({ gallery_photos: overLimit31Photos })
  assert.equal(overResult.success, false)
})

test('Tenant Config Editor: Allows tentative wedding_date (null or empty string)', () => {
  const nullDate = configSchema.safeParse({ wedding_date: null })
  assert.equal(nullDate.success, true)

  const emptyDate = configSchema.safeParse({ wedding_date: '' })
  assert.equal(emptyDate.success, true)
})

test('Tenant Config Editor: Strips unallowed injected fields before database update', () => {
  const maliciousInjection = {
    bride_name: 'Siti',
    is_admin: true,
    owner_user_id: 1,
    status: 'active',
  }

  const parsed = configSchema.safeParse(maliciousInjection)
  assert.equal(parsed.success, true)
  const allowed = ['bride_name', 'groom_name', 'bride_parents', 'groom_parents', 'wedding_photo', 'wedding_date', 'akad_date', 'akad_time', 'akad_location', 'resepsi_date', 'resepsi_time', 'resepsi_location', 'qris_image', 'bank_name', 'bank_account', 'bank_holder', 'maps_url', 'venue_address', 'quote', 'gallery_photos', 'bgm_url', 'bgm_title', 'preset']
  const fields = Object.keys(parsed.data).filter((f) => allowed.includes(f))
  assert.deepEqual(fields, ['bride_name'])
})

test('Tenant Config Editor: Serialization properly parses JSON gallery and normalizes music defaults', () => {
  const dbRow = {
    id: 5,
    invitation_id: 5,
    bride_name: 'Kia',
    groom_name: 'Toni',
    wedding_date: '2026-08-16 08:00:00',
    gallery_photos: '["/api/public/photos/photo_1.jpg", "/api/public/photos/photo_2.jpg"]',
    bgm_url: null,
    bgm_title: null,
  }

  const serialized = serializeConfig(dbRow)
  assert.equal(serialized.id, 5)
  assert.equal(Array.isArray(serialized.gallery_photos), true)
  assert.equal(serialized.gallery_photos.length, 2)
  assert.equal(serialized.wedding_date, '2026-08-16T08:00:00')
  // Legacy or null music normalizes to Marry You default
  assert.equal(serialized.bgm_url, '/audio/Marry%20You.mp3')
  assert.equal(serialized.bgm_title, 'Marry You')
})
