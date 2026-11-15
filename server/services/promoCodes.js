// Kode promo (mis. THREADS untuk pengguna Threads). Harga diatur di server lewat env PROMO_CODES:
// "KODE=harga" dipisah koma, mis. "THREADS=29999,TIKTOK=34999". Tidak diset = THREADS=29999; kosong = semua mati.
// Kode yang dipakai mengisi invitations.offer_price / offer_expires_at (mekanisme harga khusus yang sama
// dengan email pengingat), jadi pembayaran Tako otomatis memakai harga ini (services/trial.js priceFor).
export const PROMO_VALID_DAYS = 7
const DEFAULT_PROMO_CODES = 'THREADS=29999'

export function promoCodes(env = process.env) {
  const raw = env.PROMO_CODES === undefined ? DEFAULT_PROMO_CODES : String(env.PROMO_CODES)
  const map = new Map()
  for (const part of raw.split(',')) {
    const [code, price] = part.split('=').map((s) => (s || '').trim())
    const amount = Number(price)
    if (/^[A-Z0-9]{3,20}$/i.test(code) && Number.isInteger(amount) && amount > 0) map.set(code.toUpperCase(), amount)
  }
  return map
}

/**
 * → { ok: true, price } | { ok: false, code, message }
 * current: harga yang sekarang harus dibayar (priceFor). Promo hanya dipasang bila lebih murah.
 */
export function evaluatePromo(rawCode, { paid, currentAmount }, env = process.env) {
  const code = typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : ''
  if (paid) return { ok: false, code: 'ALREADY_PAID', message: 'Undangan ini sudah dibayar.' }
  const price = promoCodes(env).get(code)
  if (!price) return { ok: false, code: 'PROMO_INVALID', message: 'Kode promo tidak ditemukan atau sudah berakhir.' }
  if (Number.isInteger(currentAmount) && currentAmount > 0 && price >= currentAmount) {
    return { ok: false, code: 'PROMO_NOT_CHEAPER', message: 'Harga kamu sekarang sudah lebih murah dari promo ini.' }
  }
  return { ok: true, code, price }
}
