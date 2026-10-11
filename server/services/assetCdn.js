// Saklar CDN aset (jsDelivr). Kosong/tidak valid = nonaktif, semua aset dari server sendiri.
// Ubah di server/.env.docker lalu `docker compose up -d api` (tanpa rebuild web).
const ALLOWED = /^https:\/\/cdn\.jsdelivr\.net\/gh\/barrukurniawan\/marryme-assets@v\d{4}\.\d{2}\.\d{2}-\d+$/

export function assetCdnBase(env = process.env) {
  const value = String(env.ASSET_CDN_BASE || '').trim().replace(/\/+$/, '')
  return ALLOWED.test(value) ? value : null
}
