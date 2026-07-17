// Warna tint per-kategori untuk aset nature, dibaca dari .env (VITE_*).
// Mekanisme build-time: ganti warna butuh restart dev / rebuild.
// Default "#ffffff" = identity (tidak ada perubahan visual terhadap tekstur atlas).
//
// PENTING: nilai hex mengandung "#" yang di .env dianggap komentar.
// Selalu bungkus dengan tanda kutip, mis: VITE_COLOR_TREE="#ff6b9d"

const WHITE = '#ffffff'

function stripQuotes(v: string): string {
  return v.trim().replace(/^["']|["']$/g, '')
}

function normalizeHex(value: unknown): string {
  if (typeof value !== 'string') return WHITE
  let v = stripQuotes(value)
  if (!v) return WHITE
  if (v[0] !== '#') v = '#' + v
  // Terima 6-digit (#rrggbb) atau 8-digit (#rrggbbaa). Alpha diabaikan untuk material.color (RGB).
  if (/^#[0-9a-fA-F]{8}$/.test(v)) v = v.slice(0, 7)
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) return WHITE
  return v.toLowerCase()
}

// Untuk ground: kosong/invalid = "" (pakai gradien pink default), bukan putih.
function parseHexOrEmpty(value: unknown): string {
  if (typeof value !== 'string') return ''
  let v = stripQuotes(value)
  if (!v) return ''
  if (v[0] !== '#') v = '#' + v
  if (/^#[0-9a-fA-F]{8}$/.test(v)) v = v.slice(0, 7)
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) return ''
  return v.toLowerCase()
}

export const NATURE_COLORS = {
  tree: normalizeHex(import.meta.env.VITE_COLOR_TREE),
  bush: normalizeHex(import.meta.env.VITE_COLOR_BUSH),
  grass: normalizeHex(import.meta.env.VITE_COLOR_GRASS),
  animal: normalizeHex(import.meta.env.VITE_COLOR_ANIMAL)
} as const

// Warna dasar gradien tanah (sisi kiri-kanan). Kosong = gradien pink default.
export const GROUND_COLOR = parseHexOrEmpty(import.meta.env.VITE_COLOR_GROUND)

// Derivasi kategori dari URL aset (case-insensitive), lalu ambil warna dari env.
export function getNatureTint(url: string): string {
  const lower = url.toLowerCase()
  const segment = lower.slice(lower.lastIndexOf('/') + 1)
  if (segment.startsWith('animal')) return NATURE_COLORS.animal
  if (segment.startsWith('grass')) return NATURE_COLORS.grass
  if (segment.startsWith('bush')) return NATURE_COLORS.bush
  if (segment.startsWith('tree')) return NATURE_COLORS.tree
  return WHITE
}
