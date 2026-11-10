// Ucapan undangan 2D (taman pixel) disimpan di guestbook_entries, sama dengan buku tamu 3D,
// supaya tampil di dashboard pasangan beserta kehadiran (migration 024). Fungsi murni.
export const WISH_MAX_CHARS = 300
export const ATTENDANCE = ['Hadir', 'Ragu-ragu', 'Tidak Hadir']

const graphemes = (text) => {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    return [...new Intl.Segmenter('id', { granularity: 'grapheme' }).segment(text)].map((s) => s.segment)
  }
  return [...text]
}

/** → { ok: true, value: { name, message, attendance, requestId } } | { ok: false, error } */
export function normalizeWish(body = {}, playerName = '') {
  const message = typeof body.message === 'string' ? body.message.trim().replace(/\r\n?/g, '\n') : ''
  const length = graphemes(message).length
  if (!message || length > WISH_MAX_CHARS) return { ok: false, error: `Ucapan harus berisi 1–${WISH_MAX_CHARS} karakter` }
  if (typeof body.requestId !== 'string' || !/^[A-Za-z0-9-]{8,64}$/.test(body.requestId)) return { ok: false, error: 'Permintaan tidak valid' }
  // Kehadiran: nilai lama/kosong dari klien versi lama → 'Ragu-ragu' (tidak ditanya).
  const attendance = ATTENDANCE.includes(body.attendance) ? body.attendance : 'Ragu-ragu'
  const rawName = String(playerName || body.name || '').trim().replace(/\s+/g, ' ').slice(0, 64)
  return { ok: true, value: { name: rawName || 'Tamu Undangan', message, attendance, requestId: body.requestId } }
}

/** Baris guestbook_entries → item daftar ucapan 2D (created_at dalam ms, dipakai untuk urutan). */
export function toWishItem(row) {
  const ms = row.created_at instanceof Date ? row.created_at.getTime() : Date.parse(String(row.created_at).replace(' ', 'T') + 'Z')
  return { id: String(row.id), name: row.name, message: row.message, attendance: row.attendance, created_at: Number.isFinite(ms) ? ms : Date.now() }
}
