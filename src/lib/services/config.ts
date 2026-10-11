import { ApiError, defaultConfig, getPublicConfig, type WeddingConfig } from '../api-client'

export { defaultConfig, type WeddingConfig }

// Gangguan sesaat (server restart saat deploy, Cloudflare 52x, sinyal HP putus) dicoba ulang
// otomatis sebelum menampilkan layar error. Error pasti (404, kedaluwarsa, ditangguhkan) tidak.
const RETRY_DELAYS_MS = [1000, 2000, 3000, 4000, 6000]
const isTransient = (error: unknown) =>
  !(error instanceof ApiError) || error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500

async function getPublicConfigWithRetry(): Promise<WeddingConfig> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await getPublicConfig()
    } catch (error) {
      if (attempt >= RETRY_DELAYS_MS.length || !isTransient(error)) throw error
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]))
    }
  }
}

export async function getConfig(): Promise<WeddingConfig> {
  try {
    return await getPublicConfigWithRetry()
  } catch (err) {
    if (import.meta.env.DEV && !(err instanceof ApiError && err.status < 500)) {
      console.warn('DEV mode: backend API unreachable, fallback to defaultConfig', err)
      return defaultConfig
    }
    throw err
  }
}
