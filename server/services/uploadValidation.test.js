import assert from 'node:assert/strict'
import test from 'node:test'
import path from 'node:path'
import { isSafePhotoFilename } from './photoFiles.js'
import { cleanMusicTitle } from './musicTitle.js'

function isSafeMusicFilename(filename) {
  return filename === path.basename(filename) && /^music_[a-zA-Z0-9_-]+\.mp3$/.test(filename)
}

function validatePhotoMime(mimetype) {
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp'])
  return allowed.has(mimetype)
}

function validateMusicMime(mimetype) {
  return mimetype === 'audio/mpeg' || mimetype === 'audio/mp3'
}

function validateFileSize(bytes, maxBytes) {
  return bytes <= maxBytes
}

test('Upload Validation: Photo MIME type verification allows only JPG, PNG, and WebP', () => {
  assert.equal(validatePhotoMime('image/jpeg'), true)
  assert.equal(validatePhotoMime('image/png'), true)
  assert.equal(validatePhotoMime('image/webp'), true)

  // Disallowed formats
  assert.equal(validatePhotoMime('image/svg+xml'), false)
  assert.equal(validatePhotoMime('image/gif'), false)
  assert.equal(validatePhotoMime('application/x-php'), false)
  assert.equal(validatePhotoMime('text/html'), false)
  assert.equal(validatePhotoMime('application/octet-stream'), false)
})

test('Upload Validation: Music MIME type verification allows only MP3 audio', () => {
  assert.equal(validateMusicMime('audio/mpeg'), true)
  assert.equal(validateMusicMime('audio/mp3'), true)

  // Disallowed formats
  assert.equal(validateMusicMime('audio/wav'), false)
  assert.equal(validateMusicMime('audio/ogg'), false)
  assert.equal(validateMusicMime('video/mp4'), false)
})

test('Upload Validation: File size limit checks adhere to tier boundaries', () => {
  const TWO_MB = 2 * 1024 * 1024
  const FIVE_MB = 5 * 1024 * 1024
  const TEN_MB = 10 * 1024 * 1024

  // Photo size (max 2MB)
  assert.equal(validateFileSize(1.5 * 1024 * 1024, TWO_MB), true)
  assert.equal(validateFileSize(2 * 1024 * 1024, TWO_MB), true)
  assert.equal(validateFileSize(2.1 * 1024 * 1024, TWO_MB), false)

  // Payment proof size (max 5MB)
  assert.equal(validateFileSize(4.8 * 1024 * 1024, FIVE_MB), true)
  assert.equal(validateFileSize(5.2 * 1024 * 1024, FIVE_MB), false)

  // MP3 Music size (max 10MB)
  assert.equal(validateFileSize(8.5 * 1024 * 1024, TEN_MB), true)
  assert.equal(validateFileSize(11 * 1024 * 1024, TEN_MB), false)
})

test('Upload Validation: isSafePhotoFilename blocks directory traversal and unauthorized extensions', () => {
  // Valid generated photo filenames
  assert.equal(isSafePhotoFilename('photo_1720000000_ab12cd.jpg'), true)
  assert.equal(isSafePhotoFilename('photo_1720000000_ab12cd.png'), true)
  assert.equal(isSafePhotoFilename('photo_1720000000_ab12cd.webp'), true)

  // Path traversal attacks
  assert.equal(isSafePhotoFilename('../photo_1720000000_ab12cd.jpg'), false)
  assert.equal(isSafePhotoFilename('subdir/photo_1720000000_ab12cd.jpg'), false)
  assert.equal(isSafePhotoFilename('/etc/passwd'), false)
  assert.equal(isSafePhotoFilename('..\\photo.jpg'), false)

  // Invalid extensions and prefixes
  assert.equal(isSafePhotoFilename('proof_1720000000_ab12cd.jpg'), false)
  assert.equal(isSafePhotoFilename('photo_1720000000_ab12cd.svg'), false)
  assert.equal(isSafePhotoFilename('photo_1720000000_ab12cd.php'), false)
  assert.equal(isSafePhotoFilename('photo_1720000000_ab12cd.jpg.exe'), false)
})

test('Upload Validation: isSafeMusicFilename prevents non-standard music filenames', () => {
  assert.equal(isSafeMusicFilename('music_1720000000_ab12cd.mp3'), true)
  assert.equal(isSafeMusicFilename('../music_1720000000_ab12cd.mp3'), false)
  assert.equal(isSafeMusicFilename('music_bad.wav'), false)
  assert.equal(isSafeMusicFilename('music_1720000000_ab12cd.mp3.sh'), false)
})

test('Upload Validation: cleanMusicTitle produces human-readable song titles', () => {
  assert.equal(cleanMusicTitle('A_Thousand_Years_Christina_Perri.mp3'), 'A Thousand Years Christina Perri')
  assert.equal(cleanMusicTitle('beautiful_in_white---shane_filan.mp3'), 'beautiful in white shane filan')
  assert.equal(cleanMusicTitle('01 - Can\'t Help Falling in Love.MP3'), '01 Can\'t Help Falling in Love')
  assert.equal(cleanMusicTitle('wedding_song.m4a'), 'wedding song')
})

test('Upload Validation: Gallery item deletion logic updates array and returns 404 on missing item', () => {
  function deleteGalleryPhoto(currentList, photoUrlToDelete) {
    const updated = currentList.filter((p) => p !== photoUrlToDelete)
    if (updated.length === currentList.length) {
      return { success: false, code: 'NOT_FOUND' }
    }
    return { success: true, updatedList: updated }
  }

  const gallery = [
    '/api/public/photos/photo_1.jpg',
    '/api/public/photos/photo_2.jpg',
    '/api/public/photos/photo_3.jpg',
  ]

  // Successful deletion
  const result1 = deleteGalleryPhoto(gallery, '/api/public/photos/photo_2.jpg')
  assert.equal(result1.success, true)
  assert.deepEqual(result1.updatedList, [
    '/api/public/photos/photo_1.jpg',
    '/api/public/photos/photo_3.jpg',
  ])

  // Deleting non-existent photo
  const result2 = deleteGalleryPhoto(gallery, '/api/public/photos/photo_999.jpg')
  assert.equal(result2.success, false)
  assert.equal(result2.code, 'NOT_FOUND')
})

test('Upload Validation: Payment proof access authorization permits owner and admin only', () => {
  function authorizeProofAccess({ isAdmin, requestingUserId, invitationOwnerId, proofFilename, userProofUrl }) {
    if (isAdmin) return true
    if (requestingUserId && requestingUserId === invitationOwnerId && userProofUrl?.endsWith(proofFilename)) {
      return true
    }
    return false
  }

  const proof = 'proof_12345.jpg'
  const userProof = `/api/my/proof/${proof}`

  // Admin access
  assert.equal(authorizeProofAccess({ isAdmin: true, requestingUserId: null, invitationOwnerId: 10, proofFilename: proof, userProofUrl: userProof }), true)

  // Owner access
  assert.equal(authorizeProofAccess({ isAdmin: false, requestingUserId: 10, invitationOwnerId: 10, proofFilename: proof, userProofUrl: userProof }), true)

  // Unauthorized different user
  assert.equal(authorizeProofAccess({ isAdmin: false, requestingUserId: 99, invitationOwnerId: 10, proofFilename: proof, userProofUrl: userProof }), false)

  // Unauthenticated visitor
  assert.equal(authorizeProofAccess({ isAdmin: false, requestingUserId: null, invitationOwnerId: 10, proofFilename: proof, userProofUrl: userProof }), false)
})
