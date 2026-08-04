export function paymentMode(env = process.env) {
  return String(env.PAYMENT_MODE || 'manual').trim().toLowerCase()
}

export function invitationPriceIdr(env = process.env) {
  const value = Number(env.INVITATION_PRICE_IDR ?? 0)
  return Number.isFinite(value) && value >= 0 ? value : null
}

export function isFreeManualPackage(env = process.env) {
  return paymentMode(env) === 'manual' && invitationPriceIdr(env) === 0
}
