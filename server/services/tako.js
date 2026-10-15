// Klien API Tako (tako.id) untuk pembayaran undangan. Dokumentasi: https://tako.id/api-docs
// Pembayaran dibuat sebagai "hadiah" ke akun kreator MarryMe (TAKO_USERNAME); callback & redirect URL
// diatur di dashboard API Key Tako, bukan per request.
import { createHmac, timingSafeEqual } from 'node:crypto'

export const TAKO_METHODS = ['qris', 'gopay', 'dana', 'paypal']
const USER_AGENT = 'MarryMe/1.0'
const TIMEOUT_MS = 10_000

export function takoConfigured(env = process.env) {
  return Boolean(env.TAKO_API_KEY && env.TAKO_USERNAME)
}

const baseUrl = (env = process.env) => (env.TAKO_API_BASE || 'https://tako.id').replace(/\/$/, '')

export class TakoError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'TakoError'
    this.status = status
  }
}

async function takoRequest(path, { method = 'GET', body } = {}, env = process.env) {
  let response
  try {
    response = await fetch(`${baseUrl(env)}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${env.TAKO_API_KEY}`,
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (error) {
    throw new TakoError(`Tako tidak dapat dihubungi (${error.name === 'TimeoutError' ? 'timeout' : error.message}).`, 502)
  }
  const text = await response.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    // Halaman HTML (mis. proteksi anti-bot "Please Wait") alih-alih JSON.
  }
  if (!response.ok || !json || (json.statusCode && json.statusCode >= 400)) {
    const message = json?.error?.message || (json ? `HTTP ${response.status}` : `Respons Tako bukan JSON (HTTP ${response.status}).`)
    throw new TakoError(message, response.status)
  }
  return json.result
}

/** Buat pembayaran (hadiah) → { giftId, transactionId, paymentUrl }. */
export async function createTakoGift({ name, email, amount, paymentMethod, message }, env = process.env) {
  if (!TAKO_METHODS.includes(paymentMethod)) throw new TakoError('Metode pembayaran tidak didukung.', 400)
  const result = await takoRequest(
    `/api/v1/gift/${encodeURIComponent(env.TAKO_USERNAME)}`,
    { method: 'POST', body: { name: String(name).slice(0, 100), email, amount, paymentMethod, message: String(message || '').slice(0, 200) } },
    env,
  )
  if (!result?.transactionId || !result?.paymentUrl) throw new TakoError('Respons Tako tidak lengkap.', 502)
  return { giftId: result.giftId || null, transactionId: result.transactionId, paymentUrl: result.paymentUrl }
}

/** Status transaksi → { id, status, amount, price, paymentMethod, paymentUrl, createdAt }. */
export async function getTakoTransaction(transactionId, env = process.env) {
  return takoRequest(`/api/v1/transactions/${encodeURIComponent(transactionId)}`, {}, env)
}

/** Status Tako → status tabel payments. reversed/on_hold dibiarkan pending (ditandai lewat provider_status). */
export function mapTakoStatus(status) {
  if (status === 'success') return 'received'
  if (status === 'failed') return 'failed'
  return 'pending'
}

/**
 * Verifikasi header X-Tako-Signature (HMAC-SHA256 hex). Dokumentasi menghitungnya atas
 * JSON.stringify(body); raw body dicoba dulu supaya tidak bergantung pada urutan/format serialisasi.
 */
export function verifyTakoSignature({ rawBody, body, signature, secret }) {
  if (!secret || typeof signature !== 'string' || !/^[0-9a-f]{64}$/i.test(signature.trim())) return false
  const given = Buffer.from(signature.trim().toLowerCase(), 'hex')
  const candidates = [rawBody, body === undefined ? undefined : JSON.stringify(body)].filter((v) => typeof v === 'string')
  return candidates.some((payload) => {
    const expected = createHmac('sha256', secret).update(payload).digest()
    return expected.length === given.length && timingSafeEqual(expected, given)
  })
}
