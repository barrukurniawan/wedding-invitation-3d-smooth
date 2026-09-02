import { defaultConfig, getPublicConfig, type WeddingConfig } from '../api-client'

export { defaultConfig, type WeddingConfig }

export async function getConfig(): Promise<WeddingConfig> {
  try {
    return await getPublicConfig()
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('DEV mode: backend API unreachable, fallback to defaultConfig', err)
      return defaultConfig
    }
    throw err
  }
}
