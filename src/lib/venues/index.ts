import type { Component } from 'svelte'

// Registry venue 3D. Layout gameplay (VenueCore) sama di semua venue; yang
// berbeda per venue hanya sekeliling (lazy-loaded) dan tema langit/kabut/cahaya.
// Lihat PLAN_VENUE_3D.md.

// Harus sinkron dengan server/services/venues.js.
export type VenueId = 'garden' | 'beach'

export interface SurroundingsProps {
  lowPower?: boolean
  renderQuality?: 'mobile' | 'desktop' | 'desktop-retina'
}

// Peta warna inti (hex garden -> hex venue) untuk VenueCore; kosong = warna asli.
export type CorePalette = Record<string, string>

// Variasi elemen inti per venue. Default = garden (tiang lampu + corak bunga).
export interface CoreLayout {
  lightPoles?: boolean
  aisleMotif?: 'flower' | 'shell'
}

export interface VenueTheme {
  background: string
  fog: { color: string; near: number; far: number; nearLowPower: number; farLowPower: number }
  sky: { horizon: string; top: string }
  lighting: {
    hemisphere: { sky: string; ground: string; intensity: number }
    ambient: { color: string; intensity: number }
    sun: { position: [number, number, number]; intensity: number; color?: string }
  }
  corePalette?: CorePalette
  coreLayout?: CoreLayout
}

// Atribusi aset pihak ketiga (wajib untuk CC-BY); ditampilkan di modal pelaminan.
export interface AssetCredit {
  title: string
  author: string
  url: string
  license: string
}

export interface VenueDef {
  id: VenueId
  label: string
  theme: VenueTheme
  credits?: AssetCredit[]
  loadSurroundings: () => Promise<{ default: Component<SurroundingsProps> }>
}

// Venue yang belum punya definisi di sini otomatis jatuh ke DEFAULT_VENUE.
export const venues: Partial<Record<VenueId, VenueDef>> = {
  garden: {
    id: 'garden',
    label: 'Taman Musim Panas',
    theme: {
      background: '#8ed3f7',
      fog: { color: '#dff3fb', near: 32, far: 68, nearLowPower: 26, farLowPower: 55 },
      sky: { horizon: '#eaf8ff', top: '#8ed3f7' },
      lighting: {
        hemisphere: { sky: '#ffe8c4', ground: '#6a8b5a', intensity: 2.0 },
        ambient: { color: '#fff3dd', intensity: 0.5 },
        sun: { position: [-12, 20, 8], intensity: 2.0 }
      }
    },
    loadSurroundings: () => import('../components/threed/venues/garden/GardenSurroundings.svelte')
  },
  beach: {
    id: 'beach',
    label: 'Pantai Sunset',
    theme: {
      background: '#f6b48f',
      fog: { color: '#f7cdb0', near: 34, far: 80, nearLowPower: 28, farLowPower: 64 },
      sky: { horizon: '#ffcfa3', top: '#8a8fd6' },
      lighting: {
        hemisphere: { sky: '#ffdcbc', ground: '#c9a27a', intensity: 1.9 },
        ambient: { color: '#ffe6cf', intensity: 0.5 },
        sun: { position: [-10, 14, 12], intensity: 2.1, color: '#ffd9b0' }
      },
      // Pelaminan, karpet, dan bunga bernuansa coral; emas, ivory, dan daun tetap.
      corePalette: {
        '#b91c3c': '#2b86b0', // karpet menuju pelaminan: biru laut
        '#9c3a52': '#cf5a45', // lantai panggung
        '#6b2a3a': '#8f3b2c', // sub-base panggung
        '#9c2a40': '#23729a', // runner panggung & anak tangga: biru laut
        '#d96b7a': '#ff8a73', // drapery
        '#c97f93': '#f09a82', // landing carpet & panel meja
        '#d1677e': '#f07a63', // kotak surat
        '#d68a9b': '#f4a28c', // sandaran kursi
        '#c95778': '#ef6a55', // hati tengah
        '#f9d7df': '#ffe0d6', // hati dalam
        '#ef8daa': '#ff8f7a', // bunga backdrop
        '#f7bfd0': '#ffc2b0',
        '#e6a8d2': '#ffb38a',
        '#d96f91': '#f2725c', // bunga buket
        '#f3a7bd': '#ffa891',
        '#d99ac8': '#ffb07a',
        '#ef829f': '#ff7f6b',
        '#70975d': '#d6b07c', // alas kotak surat (rumput -> pasir)
        '#d9899d': '#f08c78', // motif jalur
        '#f4b8c7': '#ffc4b3'
      },
      coreLayout: { lightPoles: false, aisleMotif: 'shell' }
    },
    credits: [
      {
        title: 'Low Poly Beach Assets',
        author: 'EdwinRC',
        url: 'https://sketchfab.com/3d-models/low-poly-beach-assets-66c18ecd7a834d4a99dabc46b5ee6e4a',
        license: 'CC BY 4.0'
      },
      {
        title: 'Palm Tree Low Poly',
        author: 'Connor_Appleton',
        url: 'https://sketchfab.com/3d-models/palm-tree-low-poly-6198f5dd302644a2bc5e1d31fef46fb0',
        license: 'CC BY 4.0'
      }
    ],
    loadSurroundings: () => import('../components/threed/venues/beach/BeachSurroundings.svelte')
  }
}

export const DEFAULT_VENUE: VenueId = 'garden'

// Nilai kosong/tidak dikenal (data lama, typo) selalu jatuh ke venue default.
export function resolveVenue(id?: string | null): VenueDef {
  return venues[id as VenueId] ?? (venues[DEFAULT_VENUE] as VenueDef)
}
