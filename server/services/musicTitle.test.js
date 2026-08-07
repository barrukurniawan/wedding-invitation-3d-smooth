import assert from 'node:assert/strict'
import test from 'node:test'
import { cleanMusicTitle } from './musicTitle.js'

test('cleans uploaded music filenames for display', () => {
  assert.equal(cleanMusicTitle('Until I Found You.mp3'), 'Until I Found You')
  assert.equal(cleanMusicTitle('wedding_song-final.mp3'), 'wedding song final')
})
