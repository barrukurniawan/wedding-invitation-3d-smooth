import { defaultConfig, getPublicConfig, type WeddingConfig } from '../api-client'

export { defaultConfig, type WeddingConfig }

export async function getConfig(): Promise<WeddingConfig> {
  try {
    return await getPublicConfig()
  } catch (error) {
    console.error('[config] Fetch failed:', error)
    return defaultConfig
  }
}
