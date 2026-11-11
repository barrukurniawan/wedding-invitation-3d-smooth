// "Cerita Kami" undangan 2D: momen yang diisi pasangan (migration 026). Fungsi murni.
// Logika yang sama (bentuk timeline) dipakai static/presets/garden-2d/cms-bootstrap.js.
export const MAX_STORY_MOMENTS = 5
const PHOTO_PATTERN = /^\/api\/public\/photos\/[A-Za-z0-9_.-]+$/

const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

/** Input bebas (array/JSON string/null) → array momen bersih (maks 5; momen tanpa judul & cerita dibuang). */
export function normalizeStoryMoments(input) {
  let list = input
  if (typeof list === 'string') {
    try { list = JSON.parse(list) } catch { list = [] }
  }
  if (!Array.isArray(list)) return []
  const out = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const moment = {
      time: text(item.time, 60),
      title: text(item.title, 80),
      description: text(item.description, 500),
      // Hanya foto yang diunggah ke server sendiri (bukan URL luar).
      photo: typeof item.photo === 'string' && PHOTO_PATTERN.test(item.photo) ? item.photo : '',
    }
    if (!moment.title && !moment.description && !moment.photo) continue
    out.push(moment)
    if (out.length >= MAX_STORY_MOMENTS) break
  }
  return out
}
