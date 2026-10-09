// Harga & promo peluncuran untuk landing page dan halaman pembayaran.
// Semua nilai dari env supaya bisa diubah tanpa rebuild web (cukup restart api).
import { invitationPriceIdr, paymentMode } from './paymentConfig.js'

const toIdr = (value, fallback = null) => {
  if (value == null || value === '') return fallback
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback
}

const toDate = (value) => {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function pricingInfo(env = process.env, now = new Date()) {
  const currentPrice = invitationPriceIdr(env) ?? 0
  const normalPrice = toIdr(env.PRICE_NORMAL_IDR, null)
  const afterPromoPrice = toIdr(env.PRICE_AFTER_PROMO_IDR, null)
  const promoEndsAt = toDate(env.PROMO_ENDS_AT)
  // Promo hanya "aktif" kalau ada harga normal yang lebih tinggi dan tanggalnya belum lewat.
  const promoActive = Boolean(promoEndsAt && promoEndsAt > now && normalPrice != null && normalPrice > currentPrice)
  const whatsapp = String(env.WHATSAPP_NUMBER || '').replace(/\D/g, '') || null
  return {
    mode: paymentMode(env),
    currency: 'IDR',
    currentPrice,
    isFree: currentPrice === 0,
    normalPrice: promoActive ? normalPrice : null,
    afterPromoPrice: promoActive ? afterPromoPrice : null,
    promoActive,
    promoLabel: promoActive ? String(env.PROMO_LABEL || 'Promo Launching') : null,
    promoEndsAt: promoActive ? promoEndsAt.toISOString() : null,
    whatsapp,
  }
}
