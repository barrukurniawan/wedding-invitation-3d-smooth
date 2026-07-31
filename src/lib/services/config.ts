import { defaultConfig, getPublicConfig, type WeddingConfig } from '../api-client'

export { defaultConfig, type WeddingConfig }

export async function getConfig(): Promise<WeddingConfig> {
  return getPublicConfig()
}
