import assert from 'node:assert/strict'
import test from 'node:test'
import { ADMIN_CONFIG_FIELDS, pickAdminConfigFields, stripAdminConfigMetadata } from './adminConfig.js'

test('admin config projection excludes database metadata', () => {
  const payload = pickAdminConfigFields({
    id: 1,
    invitation_id: 1,
    updated_at: '2026-08-05T00:00:00.000Z',
    wedding_date: '2026-11-15T11:00',
    akad_date: 'Sabtu, 26 November 2026',
    akad_time: '08:00 - 10:00 WIB',
    akad_location: 'Kediaman Mempelai Wanita',
    resepsi_date: 'Sabtu, 26 November 2026',
    resepsi_time: '11:00 - 14:00 WIB',
    resepsi_location: 'Gedung Serbaguna',
    bgm_url: '/music.mp3',
  })

  assert.deepEqual(payload, {
    wedding_date: '2026-11-15T11:00',
    akad_date: 'Sabtu, 26 November 2026',
    akad_time: '08:00 - 10:00 WIB',
    akad_location: 'Kediaman Mempelai Wanita',
    resepsi_date: 'Sabtu, 26 November 2026',
    resepsi_time: '11:00 - 14:00 WIB',
    resepsi_location: 'Gedung Serbaguna',
  })
})

test('admin config projection preserves empty editable values and field allowlist', () => {
  const payload = pickAdminConfigFields({
    bride_name: '',
    gallery_photos: [],
    invitation_id: 99,
    unknown_field: 'must not be sent',
  })

  assert.deepEqual(payload, { bride_name: '', gallery_photos: [] })
  assert.equal(Object.keys(payload).every((field) => ADMIN_CONFIG_FIELDS.includes(field)), true)
})

test('admin update compatibility strips only known response metadata', () => {
  assert.deepEqual(
    stripAdminConfigMetadata({
      invitation_id: 1,
      id: 1,
      updated_at: '2026-08-05T00:00:00.000Z',
      wedding_date: '2026-11-15T11:00',
      unknown_field: 'still rejected by the strict schema',
    }),
    {
      wedding_date: '2026-11-15T11:00',
      unknown_field: 'still rejected by the strict schema',
    },
  )
})
