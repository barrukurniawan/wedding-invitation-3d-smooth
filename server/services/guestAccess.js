// Undangan privat (PLAN_UNDANGAN_PRIVAT.md): fungsi murni untuk kode akses tamu, mode privasi,
// batas perangkat, dan penyaringan data. Bagian yang menyentuh database ada di middleware/guestAccess.js.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export const PRIVACY_MODES = ['public', 'hide_details', 'private']
export const DEFAULT_DEVICE_LIMIT = 2
export const MAX_DEVICE_LIMIT = 5
/** Demo 2D di domain utama (landing/katalog). Satu-satunya undangan yang boleh dibaca dari root host. */
export const DEMO_SITE = 'faris-eliza'
/** Perangkat baru dari IP yang sama dalam jendela ini dianggap orang yang sama (browser WA → Safari/Chrome). */
export const SAME_IP_WINDOW_MS = 24 * 60 * 60 * 1000

// Tanpa huruf/angka yang mirip (0/O, 1/l/I) supaya aman kalau link diketik ulang.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
export const CODE_PATTERN = /^[A-Za-z0-9]{6,16}$/
export const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/

/** Kode acak ~58 bit (10 karakter dari 57 simbol), tanpa bias modulo. */
export function generateAccessCode(length = 10) {
  let code = ''
  while (code.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte < ALPHABET.length * 4 && code.length < length) code += ALPHABET[byte % ALPHABET.length]
    }
  }
  return code
}

export function normalizePrivacyMode(value) {
  return PRIVACY_MODES.includes(value) ? value : 'public'
}

/** NULL/undefined di database = tanpa batas; angka di luar 1–5 dipotong. */
export function normalizeDeviceLimit(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.min(MAX_DEVICE_LIMIT, Math.max(1, Math.round(n)))
}

export function normalizeAccessCode(value) {
  const code = typeof value === 'string' ? value.trim() : ''
  return CODE_PATTERN.test(code) ? code : null
}

export function sameCode(a, b) {
  if (!a || !b || a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

/**
 * Slug undangan untuk API multiplayer/konten 2D. Parameter `site` dari klien TIDAK dipakai:
 * di subdomain undangan slug diambil dari host, di domain utama selalu demo.
 */
export function resolveSite(hostContext) {
  return hostContext?.type === 'invitation' && hostContext.slug ? hostContext.slug : DEMO_SITE
}

/** IP asli pengunjung: Cloudflare mengirim CF-Connecting-IP; nginx tidak memakai real_ip. */
export function clientIp(req) {
  const cf = req.get?.('cf-connecting-ip')
  return (cf && cf.trim()) || req.ip || ''
}

export function hashIp(ip, salt = '') {
  return createHash('sha256').update(`${salt}|${ip}`).digest('hex').slice(0, 16)
}

/**
 * Keputusan batas perangkat untuk satu link tamu.
 * devices: [{ device_id, ip_hash, counts_slot, first_seen_ms }]
 * → { action: 'known' | 'register' | 'deny', countsSlot }
 */
export function decideDevice({ limit, devices, deviceId, ipHash, now = Date.now() }) {
  if (devices.some((d) => d.device_id === deviceId)) return { action: 'known', countsSlot: false }
  if (limit == null) return { action: 'register', countsSlot: true }
  const sameIp = devices.some((d) => d.ip_hash === ipHash && now - d.first_seen_ms <= SAME_IP_WINDOW_MS)
  if (sameIp) return { action: 'register', countsSlot: false }
  const used = devices.filter((d) => Number(d.counts_slot) === 1).length
  return used < limit ? { action: 'register', countsSlot: true } : { action: 'deny', countsSlot: false }
}

/**
 * credential: 'owner' | 'guest' | 'general' | null → level data yang boleh dilihat.
 * full: semua · limited: tanpa alamat/peta/rekening/buku tamu · none: hanya layar "undangan privat".
 */
export function accessLevel(mode, credential) {
  if (mode === 'public' || credential) return 'full'
  return mode === 'hide_details' ? 'limited' : 'none'
}

/** Kolom wedding_configs yang disembunyikan untuk level `limited`. */
export const SENSITIVE_COLUMNS = [
  'akad_location', 'resepsi_location', 'venue_address', 'maps_url',
  'bank_name', 'bank_account', 'bank_holder', 'qris_image',
  'gift_recipient', 'gift_address', 'gift_phone', 'gift_note',
]

/** Salinan baris konfigurasi dengan kolom sensitif dikosongkan (bentuk tetap sama). */
export function redactConfigRow(row) {
  const copy = { ...row }
  for (const key of SENSITIVE_COLUMNS) {
    if (key in copy) copy[key] = key.startsWith('gift_') ? null : ''
  }
  if ('gift_phone_public' in copy) copy.gift_phone_public = 0
  if ('gift_shipping' in copy) copy.gift_shipping = null
  return copy
}

/** Info akses yang ikut di respons publik (frontend memakainya untuk layar privat & nama tamu). */
export function publicAccessInfo(access) {
  return {
    privacy: access.mode,
    access: access.level,
    guest: access.guest ? { name: access.guest.name, gender: access.guest.gender } : null,
    denied_reason: access.reason || null,
  }
}
