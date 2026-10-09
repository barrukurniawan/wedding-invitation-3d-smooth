// Venue 3D yang valid. Harus sinkron dengan registry frontend (src/lib/venues/index.ts).
export const VENUE_IDS = ['garden', 'beach']
export const DEFAULT_VENUE = 'garden'

// Nilai kosong/tidak dikenal (data lama, typo) selalu jatuh ke venue default.
export function normalizeVenue(value) {
  return VENUE_IDS.includes(value) ? value : DEFAULT_VENUE
}
