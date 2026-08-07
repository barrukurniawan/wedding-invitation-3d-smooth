export const DEFAULT_MUSIC_URL = '/audio/Marry%20You.mp3'
export const DEFAULT_MUSIC_TITLE = 'Marry You'

export function normalizeMusicConfig(config) {
  return {
    ...config,
    bgm_url: config.bgm_url ?? DEFAULT_MUSIC_URL,
    bgm_title: config.bgm_title ?? DEFAULT_MUSIC_TITLE,
  }
}
