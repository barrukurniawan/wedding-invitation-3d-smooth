import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_MUSIC_TITLE, DEFAULT_MUSIC_URL, normalizeMusicConfig } from './configDefaults.js'

test('normalizes legacy null music config to Marry You', () => {
  const normalized = normalizeMusicConfig({ bride_name: 'Kia', bgm_url: null, bgm_title: null })
  assert.equal(normalized.bgm_url, DEFAULT_MUSIC_URL)
  assert.equal(normalized.bgm_title, DEFAULT_MUSIC_TITLE)
})

test('preserves explicitly selected music config', () => {
  const normalized = normalizeMusicConfig({ bgm_url: '/api/public/music/music_custom.mp3', bgm_title: 'Custom Song' })
  assert.equal(normalized.bgm_url, '/api/public/music/music_custom.mp3')
  assert.equal(normalized.bgm_title, 'Custom Song')
})
