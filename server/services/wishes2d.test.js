import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeWish, toWishItem, WISH_MAX_CHARS } from './wishes2d.js'

const rid = '0b0f3b2a-1111-4c2d-9e8f-123456789abc'

test('normalizeWish: kehadiran, nama pemain, batas 300 karakter', () => {
  const ok = normalizeWish({ message: '  Selamat ya! ', attendance: 'Hadir', requestId: rid }, 'Budi')
  assert.deepEqual(ok, { ok: true, value: { name: 'Budi', message: 'Selamat ya!', attendance: 'Hadir', requestId: rid } })
  assert.equal(normalizeWish({ message: 'x', requestId: rid }).value.attendance, 'Ragu-ragu')
  assert.equal(normalizeWish({ message: 'x', attendance: 'Mungkin', requestId: rid }).value.attendance, 'Ragu-ragu')
  assert.equal(normalizeWish({ message: 'x', requestId: rid }).value.name, 'Tamu Undangan')
  assert.equal(normalizeWish({ message: 'a'.repeat(WISH_MAX_CHARS), requestId: rid }).ok, true)
  assert.equal(normalizeWish({ message: 'a'.repeat(WISH_MAX_CHARS + 1), requestId: rid }).ok, false)
  assert.equal(normalizeWish({ message: '   ', requestId: rid }).ok, false)
  assert.equal(normalizeWish({ message: 'hai', requestId: 'x' }).ok, false)
  assert.equal(normalizeWish({ message: '❤️'.repeat(WISH_MAX_CHARS), requestId: rid }).ok, true, 'emoji dihitung per karakter tampil')
})

test('toWishItem: TIMESTAMP (Date) dan string → ms', () => {
  const d = new Date('2026-11-10T10:00:00Z')
  assert.equal(toWishItem({ id: 'abc', name: 'A', message: 'm', attendance: 'Hadir', created_at: d }).created_at, d.getTime())
  assert.equal(toWishItem({ id: 1, name: 'A', message: 'm', attendance: 'Hadir', created_at: '2026-11-10 10:00:00' }).created_at, d.getTime())
})
