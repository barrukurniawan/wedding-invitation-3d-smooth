import { writable } from 'svelte/store'
import { defaultConfig, type WeddingConfig } from '../api-client'
import { getConfig } from '../services/config'

export const weddingConfig = writable<WeddingConfig>(defaultConfig)
export const configLoaded = writable(false)

export async function loadConfig() {
  const config = await getConfig()
  weddingConfig.set(config)
  configLoaded.set(true)
}
