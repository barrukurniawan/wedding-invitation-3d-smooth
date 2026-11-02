// Undangan privat (PLAN_UNDANGAN_PRIVAT.md): kode akses tamu (`?k=`) dan ID perangkat dikirim
// sebagai header ke API. Kode HANYA diambil dari URL (tidak diingat browser): tanpa `?k=` = terkunci.
// Link di riwayat WA/browser tetap membawa `?k=`. ID perangkat disimpan di localStorage (`mm_device_id`),
// dibaca juga oleh app.html (fetch awal) dan preset 2D (index.html `__inviteHeaders`).

const CODE_PATTERN = /^[A-Za-z0-9]{6,16}$/
const DEVICE_KEY = 'mm_device_id'

function isInvitationHost() {
  if (typeof location === 'undefined') return false
  const h = location.hostname.toLowerCase()
  if (h === 'localhost' || h === '127.0.0.1' || h === 'marryme.web.id' || h === 'www.marryme.web.id') return false
  return !location.pathname.startsWith('/admin')
}

function storageGet(name: string) {
  try {
    return localStorage.getItem(name)
  } catch {
    return null
  }
}

function storageSet(name: string, value: string) {
  try {
    localStorage.setItem(name, value)
  } catch {
    // Mode privat/penyimpanan diblokir: kode tetap dipakai dari URL selama halaman terbuka.
  }
}

let memoryKey: string | null = null
let memoryDevice: string | null = null

/** Kode dari URL saja. */
export function inviteKey(): string | null {
  if (!isInvitationHost()) return null
  if (memoryKey) return memoryKey
  const fromUrl = new URLSearchParams(location.search).get('k')?.trim() || ''
  memoryKey = CODE_PATTERN.test(fromUrl) ? fromUrl : null
  return memoryKey
}

/** ID acak per browser untuk batas perangkat (bukan sidik jari; hilang bila data situs dihapus). */
export function inviteDeviceId(): string | null {
  if (!isInvitationHost()) return null
  if (memoryDevice) return memoryDevice
  let id = storageGet(DEVICE_KEY)
  if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    id = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    storageSet(DEVICE_KEY, id)
    // Penyimpanan diblokir: jangan kirim ID acak yang berubah tiap buka halaman (server memakai IP).
    if (storageGet(DEVICE_KEY) !== id) return null
  }
  memoryDevice = id
  return id
}

export function applyInviteHeaders(headers: Headers) {
  const key = inviteKey()
  const device = inviteDeviceId()
  if (key) headers.set('X-Invite-Key', key)
  if (device) headers.set('X-Invite-Device', device)
}
