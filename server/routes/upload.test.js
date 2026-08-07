import assert from 'node:assert/strict'
import test from 'node:test'
import { isSafePhotoFilename } from '../services/photoFiles.js'

test('accepts generated photo filenames only', () => {
  assert.equal(isSafePhotoFilename('photo_1720000000_ab12cd.jpg'), true)
  assert.equal(isSafePhotoFilename('photo_1720000000_ab12cd.webp'), true)
  assert.equal(isSafePhotoFilename('../photo_1720000000_ab12cd.jpg'), false)
  assert.equal(isSafePhotoFilename('proof_1720000000_ab12cd.jpg'), false)
  assert.equal(isSafePhotoFilename('photo_bad.svg'), false)
})
