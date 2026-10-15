// Gaya busana karakter preset 2D (garden-2d). Harus sinkron dengan cms-bootstrap.js
// (STYLE_ASSETS) dan tipe CharacterStyle di src/lib/api-client.ts.
export const CHARACTER_STYLES = ['hijab', 'umum']
// Default undangan baru (kolom DB default 'umum'); undangan lama diset 'hijab' oleh migrasi 018.
export const DEFAULT_CHARACTER_STYLE = 'umum'

// Nilai kosong/tidak dikenal (data lama, typo) selalu jatuh ke gaya default.
export function normalizeCharacterStyle(value) {
  return CHARACTER_STYLES.includes(value) ? value : DEFAULT_CHARACTER_STYLE
}

// Aset yang berbeda per gaya. Path relatif terhadap /presets/garden-2d/.
const STYLE_ASSETS = {
  hijab: {
    couple: 'assets/mempelai.webp',
    guests: 'assets/wedding-guests-v2.webp',
    seated: 'assets/seated-guests.webp',
    hosts: 'assets/wedding-hosts.webp',
    coverBlank: 'assets/wedding-card-blank.webp',
    ceremonyBackground: 'assets/ceremony-background.png',
    womanAtlas: 'assets/woman-atlas.png',
  },
  umum: {
    couple: 'assets/mempelai-umum.webp',
    guests: 'assets/wedding-guests-umum.webp',
    seated: 'assets/seated-guests-umum.webp',
    hosts: 'assets/wedding-hosts-umum.webp',
    coverBlank: 'assets/wedding-card-blank-umum.webp',
    ceremonyBackground: 'assets/ceremony-background-umum.webp',
    // ?v=: nama file sama, isi diganti (versi lebih tajam); nginx/Cloudflare menyimpan preset immutable.
    womanAtlas: 'assets/woman-atlas-umum.png?v=20261015b',
  },
}

export function characterStyleAssets(value) {
  return STYLE_ASSETS[normalizeCharacterStyle(value)]
}
