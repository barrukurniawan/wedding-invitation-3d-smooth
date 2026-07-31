import { writable } from 'svelte/store'
import { ApiError, defaultConfig, type WeddingConfig } from '../api-client'
import { getConfig } from '../services/config'

export type WeddingConfigStatus = 'idle' | 'loading' | 'ready' | 'notFound' | 'expired' | 'suspended' | 'error'

export const weddingConfig = writable<WeddingConfig>(defaultConfig)
export const configLoaded = writable(false)
export const configStatus = writable<WeddingConfigStatus>('idle')
export const configError = writable('')

export async function loadConfig() {
  configLoaded.set(false)
  configError.set('')
  configStatus.set('loading')

  try {
    const config = await getConfig()
    weddingConfig.set(config)
    configLoaded.set(true)
    configStatus.set('ready')
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.code === 'INVITATION_EXPIRED') configStatus.set('expired')
      else if (error.code === 'INVITATION_SUSPENDED') configStatus.set('suspended')
      else if (['TENANT_NOT_FOUND', 'TENANT_HOST_REQUIRED', 'INVITATION_INACTIVE', 'CONFIG_NOT_FOUND'].includes(error.code)) configStatus.set('notFound')
      else {
        configError.set(error.message)
        configStatus.set('error')
      }
      return
    }

    configError.set('Undangan tidak dapat dimuat. Periksa koneksi lalu coba lagi.')
    configStatus.set('error')
  }
}
