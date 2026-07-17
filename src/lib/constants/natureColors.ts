// Tint per-jenis aset nature. Warna bisa di-override dari .env (VITE_TINT_*),
// fallback ke default hardcode di bawah. #ffffff = pakai warna atlas asli.
//
// Karena semua aset Tree/Bush/Grass memakai satu material atlas, tint berlaku
// seragam ke daun DAN batang (batasan aset). Edit .env lalu restart dev/build.

import { getNatureTint, normalizeHex } from './natureTheme'

const env = import.meta.env

// Default tint per jenis (dipakai bila .env tidak men-set var terkait).
export const NATURE_TINTS: Record<string, string> = {
  // === POHON ===
  'tree-high.glb': '#27cd46',
  'tree.glb': '#27cd46',
  'tree_1_a_color1.glb': '#27cd46',
  'tree_1_b_color1.glb': '#27cd46',
  'tree_1_c_color1.glb': '#27cd46',
  'tree_2_a_color1.glb': '#27cd46',
  'tree_2_b_color1.glb': '#27cd46',
  'tree_2_c_color1.glb': '#27cd46',
  'tree_2_d_color1.glb': '#27cd46',
  'tree_2_e_color1.glb': '#27cd46',
  'tree_3_a_color1.glb': '#27cd46',
  'tree_3_b_color1.glb': '#27cd46',
  'tree_3_c_color1.glb': '#27cd46',
  'tree_4_a_color1.glb': '#27cd46',
  'tree_4_b_color1.glb': '#27cd46',
  'tree_4_c_color1.glb': '#27cd46',
  'tree_bare_1_a_color1.glb': '#27cd46',
  'tree_bare_1_b_color1.glb': '#27cd46',
  'tree_bare_1_c_color1.glb': '#27cd46',
  'tree_bare_2_a_color1.glb': '#27cd46',
  'tree_bare_2_b_color1.glb': '#27cd46',
  'tree_bare_2_c_color1.glb': '#27cd46',

  // === SEMAK ===
  'bush_1_a_color1.glb': '#23ca7f',
  'bush_2_a_color1.glb': '#23ca7f',
  'bush_3_a_color1.glb': '#23ca7f',
  'bush_4_a_color1.glb': '#23ca7f',
  'bush_4_d_color1.glb': '#23ca7f',
  'bush_4_e_color1.glb': '#23ca7f',
  'bush_4_f_color1.glb': '#23ca7f',

  // === RUMPUT / BUNGA ===
  'grass_1_a_color1.glb': '#39f239',
  'grass_1_b_color1.glb': '#39f239',
  'grass_1_c_color1.glb': '#39f239',
  'grass_2_a_color1.glb': '#39f239',
  'grass_2_b_color1.glb': '#39f239',
  'grass_2_c_color1.glb': '#39f239',

  // === HEWAN ===
  'animal-bunny.glb': '#ffff2c',
  'animal-cat.glb': '#ffff2c',
  'animal-panda.glb': '#ffff2c',

  // === LAMPU ===
  // Tiang putih via materialColors di Environment.svelte; tint putih = identity.
  'street_light.glb': '#ffffff',
}

// Nama env var: VITE_TINT_ + basename (tanpa .glb) uppercase, non-alnum -> _.
function envNameFor(basename: string): string {
  return (
    'VITE_TINT_' +
    basename
      .replace(/\.glb$/i, '')
      .replace(/[^a-z0-9]/gi, '_')
      .toUpperCase()
  )
}

// Baca tint dari .env untuk basename tertentu (string valid atau undefined).
function readEnvTint(basename: string): string | undefined {
  const v = env[envNameFor(basename)]
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined
}

// Prioritas tint: .env (VITE_TINT_*) > NATURE_TINTS default > kategori env > #ffffff.
export function getNatureTintForUrl(url: string): string {
  const lower = url.toLowerCase()
  const segment = lower.slice(lower.lastIndexOf('/') + 1)
  const fromEnv = readEnvTint(segment)
  if (fromEnv) return normalizeHex(fromEnv)
  if (NATURE_TINTS[segment] !== undefined) return normalizeHex(NATURE_TINTS[segment])
  return getNatureTint(url)
}
