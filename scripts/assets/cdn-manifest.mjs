// Daftar aset yang disajikan lewat CDN (jsDelivr, repo publik marryme-assets).
// Hanya aset desain bawaan yang memang sudah publik. JANGAN tambahkan unggahan pengguna,
// file konfigurasi, atau apa pun yang berisi data pribadi.
import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'

export const STATIC_DIR = path.resolve('static')

// File preset 2D yang dipakai game.js / cms-bootstrap.js / style.css / server konten.
// (Lagu wedding-song-complete.m4a sengaja tidak ikut: besar & diputar setelah tamu mulai.)
const PRESET_2D = [
  'garden.webp', 'front-gate.webp', 'wedding-guests-v2.webp', 'seated-guests.webp', 'wedding-hosts.webp',
  'character-atlas.png', 'woman-atlas.png', 'wedding-card-blank.webp', 'wedding-card.webp',
  'mempelai.webp', 'pianist-idle.webp', 'pianist.webp', 'singer-idle.webp', 'singer.webp',
  'nunito-extrabold.woff2', 'caveat-semibold.woff2', 'button-pop.mp3',
  'ceremony-background.png', 'gallery-background.png', 'gifts-background.png', 'story-background.png', 'wishes-background.png',
  'gallery-1.jpg', 'gallery-2.jpg', 'gallery-3.jpg',
  // Gaya busana "umum" (tanpa hijab), dipilih per undangan (server/services/characterStyles.js).
  'mempelai-umum.webp', 'wedding-guests-umum.webp', 'seated-guests-umum.webp', 'wedding-hosts-umum.webp',
  'wedding-card-blank-umum.webp', 'ceremony-background-umum.webp', 'woman-atlas-umum.png',
].map((f) => `presets/garden-2d/assets/${f}`)

// Folder 3D & media: semua file kecuali sumber yang tidak dipakai runtime.
const DIRS = ['models', 'nature', 'media']
const EXCLUDE = /\.(obj|mtl|blend|psd|md|txt)$/i

function walk(rel) {
  const abs = path.join(STATIC_DIR, rel)
  return readdirSync(abs).flatMap((name) => {
    const r = path.posix.join(rel, name)
    return statSync(path.join(STATIC_DIR, r)).isDirectory() ? walk(r) : [r]
  })
}

export function manifestFiles() {
  const files = [...PRESET_2D, ...DIRS.flatMap(walk).filter((f) => !EXCLUDE.test(f))]
  return [...new Set(files)].sort()
}
