import path from 'node:path'

export function isSafePhotoFilename(filename) {
  return filename === path.basename(filename) && /^photo_[a-zA-Z0-9_-]+\.(?:jpg|png|webp)$/.test(filename)
}
