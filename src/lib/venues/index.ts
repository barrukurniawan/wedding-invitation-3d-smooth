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

export interface VenueTheme {
  background: string
  fog: { color: string; near: number; far: number; nearLowPower: number; farLowPower: number }
  sky: { horizon: string; top: string }
  lighting: {
    hemisphere: { sky: string; ground: string; intensity: number }
    ambient: { color: string; intensity: number }
    sun: { position: [number, number, number]; intensity: number }
  }
}

export interface VenueDef {
  id: VenueId
  label: string
  theme: VenueTheme
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
  }
}

export const DEFAULT_VENUE: VenueId = 'garden'

// Nilai kosong/tidak dikenal (data lama, typo) selalu jatuh ke venue default.
export function resolveVenue(id?: string | null): VenueDef {
  return venues[id as VenueId] ?? (venues[DEFAULT_VENUE] as VenueDef)
}
