// Uji coba 3 hari + bayar sekali aktif selamanya (PLAN_TRIAL_3_HARI.md). Fungsi murni supaya mudah diuji;
// kolom DATETIME dari MySQL berupa string UTC "YYYY-MM-DD HH:MM:SS" (pool memakai dateStrings).
import { invitationPriceIdr } from './paymentConfig.js'

const num = (value, fallback) => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function trialConfig(env = process.env) {
  const offer = Number(env.TRIAL_OFFER_PRICE_IDR)
  return {
    hours: Math.round(num(env.TRIAL_DAYS, 3) * 24), // tepat 24 jam x hari, dihitung sampai detik
    offerPrice: Number.isInteger(offer) && offer > 0 ? offer : null,
    offerHours: num(env.TRIAL_OFFER_HOURS, 48),
  }
}

/** DATETIME UTC dari MySQL (string atau Date) → epoch ms, atau null. */
export function utcMs(value) {
  if (!value) return null
  if (value instanceof Date) return value.getTime()
  const ms = Date.parse(`${String(value).replace(' ', 'T')}Z`)
  return Number.isNaN(ms) ? null : ms
}

/** Epoch ms → ISO string, atau null. */
export const toIso = (ms) => (ms == null ? null : new Date(ms).toISOString())

/**
 * Boleh dibuka tamu? → { ok: true } | { ok: false, status, code, message, ownerPreview }.
 * ownerPreview: pemilik yang login tetap boleh melihat (pratinjau).
 */
export function guestAccess(inv, now = Date.now()) {
  if (inv.status === 'suspended') return deny(403, 'INVITATION_SUSPENDED', 'Undangan sedang tidak tersedia.', false)
  if (inv.status === 'expired') return deny(410, 'INVITATION_EXPIRED', 'Masa aktif undangan telah berakhir.', false)
  if (inv.status !== 'active') return deny(404, 'INVITATION_INACTIVE', 'Undangan tidak ditemukan.', true)
  if (utcMs(inv.paid_at) != null) return { ok: true } // sudah bayar: aktif selamanya
  const trialEnd = utcMs(inv.trial_ends_at)
  if (trialEnd != null) {
    return trialEnd > now ? { ok: true, trial: true } : deny(403, 'INVITATION_TRIAL_ENDED', 'Undangan ini sedang tidak aktif.', true)
  }
  // Akun gratis lama: sampai 7 hari setelah resepsi (expires_at).
  const expires = utcMs(inv.expires_at)
  if (expires != null && expires <= now) return deny(410, 'INVITATION_EXPIRED', 'Masa aktif undangan telah berakhir.', false)
  return { ok: true }
}

function deny(status, code, message, ownerPreview) {
  return { ok: false, status, code, message, ownerPreview }
}

/** Harga yang ditagih untuk undangan ini: harga khusus bila masih berlaku, kalau tidak harga normal. */
export function priceFor(inv, now = Date.now(), env = process.env) {
  const base = invitationPriceIdr(env)
  const offerEnd = utcMs(inv.offer_expires_at)
  const offer = Number(inv.offer_price)
  if (offerEnd != null && offerEnd > now && Number.isInteger(offer) && offer > 0 && (base == null || offer < base)) {
    return { amount: offer, normal: base, offer: true, offerExpiresAt: toIso(offerEnd) }
  }
  return { amount: base, normal: base, offer: false, offerExpiresAt: null }
}

/** Ringkasan untuk dashboard pemilik. phase: trial | trial_ended | paid | free | none */
export function ownerTrialState(inv, { free }, now = Date.now(), env = process.env) {
  const paidMs = utcMs(inv.paid_at)
  const trialEnd = utcMs(inv.trial_ends_at)
  let phase = 'none'
  if (paidMs != null) phase = 'paid'
  else if (trialEnd != null) phase = trialEnd > now ? 'trial' : 'trial_ended'
  else if (free) phase = 'free'
  const price = phase === 'trial' || phase === 'trial_ended' || phase === 'none' ? priceFor(inv, now, env) : null
  return {
    phase,
    trial_ends_at: toIso(trialEnd),
    paid_at: toIso(paidMs),
    price: price?.amount ?? null,
    normal_price: price?.normal ?? null,
    offer_expires_at: price?.offer ? price.offerExpiresAt : null,
  }
}

/** Butuh email pengingat sekarang? (sisa ≤ 24 jam, atau habis < 24 jam lalu, belum dibayar, belum dikirim) */
export function needsReminder(inv, now = Date.now()) {
  const trialEnd = utcMs(inv.trial_ends_at)
  if (trialEnd == null || utcMs(inv.paid_at) != null || utcMs(inv.trial_reminder_sent_at) != null) return false
  const day = 24 * 3600 * 1000
  return trialEnd - now <= day && now - trialEnd < day
}
