import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  CHARACTER_STYLES,
  DEFAULT_CHARACTER_STYLE,
  characterStyleAssets,
  normalizeCharacterStyle,
} from './characterStyles.js'

const presetDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../static/presets/garden-2d')

test('default character style for new invitations is umum', () => {
  assert.equal(DEFAULT_CHARACTER_STYLE, 'umum')
  assert.ok(CHARACTER_STYLES.includes(DEFAULT_CHARACTER_STYLE))
})

test('normalizeCharacterStyle keeps known styles and falls back otherwise', () => {
  assert.equal(normalizeCharacterStyle('umum'), 'umum')
  assert.equal(normalizeCharacterStyle('hijab'), 'hijab')
  for (const value of [undefined, null, '', 'HIJAB', 'casual', 1]) {
    assert.equal(normalizeCharacterStyle(value), 'umum')
  }
})

test('every style defines the same asset keys and the files exist', () => {
  const keys = Object.keys(characterStyleAssets('hijab')).sort()
  for (const style of CHARACTER_STYLES) {
    const assets = characterStyleAssets(style)
    assert.deepEqual(Object.keys(assets).sort(), keys)
    for (const file of Object.values(assets)) {
      assert.ok(existsSync(path.join(presetDir, file.split('?')[0])), `${style}: ${file} tidak ada`)
    }
  }
  assert.notEqual(characterStyleAssets('umum').couple, characterStyleAssets('hijab').couple)
})
