// Nama acara (sama dengan server/services/eventTitles.js): kosong = 'Akad Nikah' / 'Resepsi'.
type EventTitleSource = { akad_title?: string | null; resepsi_title?: string | null; resepsi_enabled?: boolean | number | null }

const clean = (value: unknown) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 60) : '')

export function eventTitles(config: EventTitleSource) {
  const customFirst = clean(config.akad_title)
  const first = customFirst || 'Akad Nikah'
  const second = clean(config.resepsi_title) || 'Resepsi'
  const secondEnabled = !(config.resepsi_enabled === false || config.resepsi_enabled === 0)
  const firstShort = customFirst || 'Akad'
  return { first, second, secondEnabled, firstShort, placeTitle: secondEnabled ? `${firstShort} & ${second}` : first }
}
