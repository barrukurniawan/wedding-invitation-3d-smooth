import assert from 'node:assert/strict'
import test from 'node:test'
import {
  accessLevel,
  CODE_PATTERN,
  decideDevice,
  DEMO_SITE,
  generateAccessCode,
  hashIp,
  normalizeAccessCode,
  normalizeDeviceLimit,
  normalizePrivacyMode,
  publicAccessInfo,
  redactConfigRow,
  resolveSite,
  sameCode,
  SAME_IP_WINDOW_MS,
} from './guestAccess.js'

test('generateAccessCode: 10 karakter, tanpa simbol mirip, unik', () => {
  const codes = new Set()
  for (let i = 0; i < 2000; i++) {
    const code = generateAccessCode()
    assert.equal(code.length, 10)
    assert.match(code, CODE_PATTERN)
    assert.doesNotMatch(code, /[0O1lI]/)
    codes.add(code)
  }
  assert.equal(codes.size, 2000)
})

test('normalisasi mode, batas perangkat, dan kode', () => {
  assert.equal(normalizePrivacyMode('private'), 'private')
  assert.equal(normalizePrivacyMode('hide_details'), 'hide_details')
  assert.equal(normalizePrivacyMode(undefined), 'public')
  assert.equal(normalizePrivacyMode('rahasia'), 'public')

  assert.equal(normalizeDeviceLimit(null), null)
  assert.equal(normalizeDeviceLimit(undefined), null)
  assert.equal(normalizeDeviceLimit(2), 2)
  assert.equal(normalizeDeviceLimit('3'), 3)
  assert.equal(normalizeDeviceLimit(99), 5)
  assert.equal(normalizeDeviceLimit(0), null)

  assert.equal(normalizeAccessCode(' abcDEF2345 '), 'abcDEF2345')
  assert.equal(normalizeAccessCode('ab'), null)
  assert.equal(normalizeAccessCode("x' OR 1=1"), null)
  assert.equal(normalizeAccessCode(undefined), null)
})

test('sameCode: aman untuk null dan panjang berbeda', () => {
  assert.equal(sameCode('abcdefgh', 'abcdefgh'), true)
  assert.equal(sameCode('abcdefgh', 'abcdefgX'), false)
  assert.equal(sameCode('abcdefgh', 'abc'), false)
  assert.equal(sameCode('abcdefgh', null), false)
  assert.equal(sameCode(null, null), false)
})

test('resolveSite: parameter site klien tidak pernah dipakai (celah ?site=)', () => {
  assert.equal(resolveSite({ type: 'invitation', slug: 'kia-toni' }), 'kia-toni')
  assert.equal(resolveSite({ type: 'root' }), DEMO_SITE)
  assert.equal(resolveSite(undefined), DEMO_SITE)
})

test('accessLevel: publik selalu penuh; privat butuh kredensial', () => {
  assert.equal(accessLevel('public', null), 'full')
  assert.equal(accessLevel('hide_details', null), 'limited')
  assert.equal(accessLevel('private', null), 'none')
  for (const credential of ['guest', 'general', 'owner']) {
    assert.equal(accessLevel('private', credential), 'full')
    assert.equal(accessLevel('hide_details', credential), 'full')
  }
})

test('decideDevice: maks 2 perangkat, perangkat lama tetap boleh', () => {
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const devices = []
  const add = (id, ip, countsSlot) => devices.push({ device_id: id, ip_hash: ip, counts_slot: countsSlot ? 1 : 0, first_seen_ms: now - 2 * day })

  assert.deepEqual(decideDevice({ limit: 2, devices, deviceId: 'hp-a', ipHash: 'ip1', now }), { action: 'register', countsSlot: true })
  add('hp-a', 'ip1', true)
  assert.equal(decideDevice({ limit: 2, devices, deviceId: 'hp-a', ipHash: 'ip9', now }).action, 'known')
  assert.equal(decideDevice({ limit: 2, devices, deviceId: 'hp-b', ipHash: 'ip2', now }).action, 'register')
  add('hp-b', 'ip2', true)
  assert.equal(decideDevice({ limit: 2, devices, deviceId: 'hp-c', ipHash: 'ip3', now }).action, 'deny')
  assert.equal(decideDevice({ limit: null, devices, deviceId: 'hp-c', ipHash: 'ip3', now }).action, 'register')
  assert.equal(decideDevice({ limit: 3, devices, deviceId: 'hp-c', ipHash: 'ip3', now }).action, 'register')
})

test('decideDevice: browser WA lalu Safari (IP sama ≤24 jam) tidak memakai jatah', () => {
  const now = Date.now()
  const devices = [{ device_id: 'wa-inapp', ip_hash: 'rumah', counts_slot: 1, first_seen_ms: now - 60_000 }]
  const safari = decideDevice({ limit: 1, devices, deviceId: 'safari', ipHash: 'rumah', now })
  assert.deepEqual(safari, { action: 'register', countsSlot: false })
  devices.push({ device_id: 'safari', ip_hash: 'rumah', counts_slot: 0, first_seen_ms: now })
  // Perangkat lain di IP lain tetap ditolak (jatah 1 sudah dipakai wa-inapp).
  assert.equal(decideDevice({ limit: 1, devices, deviceId: 'hp-teman', ipHash: 'kantor', now }).action, 'deny')
  // IP sama tapi sudah lewat 24 jam: tidak dianggap orang yang sama.
  const old = [{ device_id: 'wa-inapp', ip_hash: 'rumah', counts_slot: 1, first_seen_ms: now - SAME_IP_WINDOW_MS - 1 }]
  assert.equal(decideDevice({ limit: 1, devices: old, deviceId: 'lain', ipHash: 'rumah', now }).action, 'deny')
})

test('redactConfigRow: alamat, peta, rekening, QRIS, kado dikosongkan; data lain utuh', () => {
  const row = {
    bride_name: 'Kia', groom_name: 'Toni', akad_date: 'Sabtu', wedding_photo: '/p.webp',
    akad_location: 'Masjid', resepsi_location: 'Gedung', venue_address: 'Jl. Mawar 1', maps_url: 'https://maps',
    bank_name: 'BCA', bank_account: '123', bank_holder: 'Toni', qris_image: '/q.webp',
    gift_recipient: 'Toni', gift_address: 'Jl. Melati', gift_phone: '0812', gift_phone_public: 1, gift_note: 'x',
  }
  const out = redactConfigRow(row)
  for (const key of ['akad_location', 'resepsi_location', 'venue_address', 'maps_url', 'bank_name', 'bank_account', 'bank_holder', 'qris_image']) {
    assert.equal(out[key], '', key)
  }
  for (const key of ['gift_recipient', 'gift_address', 'gift_phone', 'gift_note']) assert.equal(out[key], null, key)
  assert.equal(out.gift_phone_public, 0)
  assert.equal(out.bride_name, 'Kia')
  assert.equal(out.akad_date, 'Sabtu')
  assert.equal(out.wedding_photo, '/p.webp')
  assert.equal(row.bank_account, '123', 'baris asli tidak diubah')
})

test('publicAccessInfo & hashIp', () => {
  assert.deepEqual(
    publicAccessInfo({ mode: 'private', level: 'full', guest: { name: 'Bu Ani', gender: 'f', id: 'x' }, reason: null }),
    { privacy: 'private', access: 'full', guest: { name: 'Bu Ani', gender: 'f' }, denied_reason: null },
  )
  assert.equal(publicAccessInfo({ mode: 'private', level: 'none', guest: null, reason: 'DEVICE_LIMIT' }).denied_reason, 'DEVICE_LIMIT')
  assert.equal(hashIp('1.2.3.4', '7').length, 16)
  assert.notEqual(hashIp('1.2.3.4', '7'), hashIp('1.2.3.4', '8'))
})
