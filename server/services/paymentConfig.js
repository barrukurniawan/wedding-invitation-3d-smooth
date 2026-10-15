export function paymentMode(env = process.env) {
  return String(env.PAYMENT_MODE || 'manual').trim().toLowerCase()
}

/**
 * Harga undangan saat ini. Selama promo: INVITATION_PRICE_IDR. Begitu PROMO_ENDS_AT lewat dan
 * PRICE_AFTER_PROMO_IDR diisi, harga otomatis berganti tanpa perlu mengubah env/restart.
 * (Akun yang mendaftar selama harga Rp0 tetap gratis selamanya: users.free_plan.)
 */
export function invitationPriceIdr(env = process.env, now = Date.now()) {
  const endsAt = Date.parse(env.PROMO_ENDS_AT || '')
  const after = env.PRICE_AFTER_PROMO_IDR === undefined || env.PRICE_AFTER_PROMO_IDR === '' ? NaN : Number(env.PRICE_AFTER_PROMO_IDR)
  if (Number.isFinite(endsAt) && now >= endsAt && Number.isFinite(after) && after >= 0) return Math.round(after)
  const value = Number(env.INVITATION_PRICE_IDR ?? 0)
  return Number.isFinite(value) && value >= 0 ? value : null
}

export function isFreeManualPackage(env = process.env) {
  return paymentMode(env) === 'manual' && invitationPriceIdr(env) === 0
}
