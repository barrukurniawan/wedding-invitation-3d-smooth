// Nama acara (PLAN: request "Pemberkatan"). Kolom akad_title/resepsi_title kosong = nama bawaan.
// Dipakai /api/config, konten 2D (routes/multiplayer.js) — logika yang sama ada di
// static/presets/garden-2d/cms-bootstrap.js (eventTitles) dan src/lib/utils/eventTitles.ts.
export const DEFAULT_FIRST_TITLE = 'Akad Nikah'
export const DEFAULT_SECOND_TITLE = 'Resepsi'

const clean = (value) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 60) : '')

/** → { first, second, secondEnabled, placeTitle, firstShort } */
export function eventTitles(config = {}) {
  const customFirst = clean(config.akad_title)
  const first = customFirst || DEFAULT_FIRST_TITLE
  const second = clean(config.resepsi_title) || DEFAULT_SECOND_TITLE
  const secondEnabled = !(config.resepsi_enabled === 0 || config.resepsi_enabled === false || config.resepsi_enabled === '0')
  // Bawaan tetap "Akad & Resepsi" (bukan "Akad Nikah & Resepsi").
  const firstShort = customFirst || 'Akad'
  const placeTitle = secondEnabled ? `${firstShort} & ${second}` : first
  return { first, second, secondEnabled, placeTitle, firstShort }
}
