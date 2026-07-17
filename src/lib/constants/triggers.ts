export type ModalType = 'npc' | 'guestbook' | 'weddingStage' | null

export interface NpcData {
  name: string
  avatar: string
  messages: string[]
  venueAddress?: string
  mapsUrl?: string
}

export interface TriggerZone {
  id: string
  label: string
  position: [number, number, number]
  radius: number
  action: ModalType
  npcData?: NpcData
}

export const triggerZones: TriggerZone[] = [
  {
    id: 'receptionist',
    label: 'Resepsionis',
    position: [4, 0, -4],
    radius: 2.5,
    action: 'npc',
    npcData: {
      name: 'Resepsionis',
      avatar: '💁‍♀️',
      messages: [
        'Selamat datang di pernikahan Kia & Toni! 🎉',
        'Silakan berjalan ke arah pelaminan melalui jalan lurus ke depan.',
        'Jangan lupa mengisi buku tamu di kotak surat ya! 📮'
      ]
    }
  },
  {
    id: 'mailbox',
    label: 'Buku Tamu',
    position: [-5, 0, -10],
    radius: 2.2,
    action: 'guestbook'
  },
  {
    id: 'weddingStage',
    label: 'Pelaminan',
    position: [0, 0, -18],
    radius: 3.5,
    action: 'weddingStage'
  },
  {
    id: 'npcGuide',
    label: 'Penunjuk Jalan',
    position: [4, 0, -10],
    radius: 2.2,
    action: 'npc',
    npcData: {
      name: 'Pemandu',
      avatar: '🧑‍🦯',
      messages: [
        'Venue pernikahan berada di alamat yang tercantum di bawah ini. Gunakan tombol Maps untuk membuka rute lokasi.',
        'Setelah itu, silakan lanjut maju ke pelaminan untuk menyapa Kia & Toni.'
      ],
      venueAddress: 'Venue Pernikahan Kia & Toni',
      mapsUrl: 'https://maps.app.goo.gl/uvFSZDLTFFYxuwGP7'
    }
  }
]

export const colliders = [
  { minX: 3.3, maxX: 4.7, minZ: -5.85, maxZ: -2.15 },
  { minX: -5.6, maxX: -4.4, minZ: -10.6, maxZ: -9.4 },
  { minX: 3.5, maxX: 4.5, minZ: -10.5, maxZ: -9.5 }
]

export const STAGE = {
  minX: -5.25,
  maxX: 5.25,
  minZ: -20.4,
  maxZ: -15.55,
  height: 0.7
}
export const STAGE_ENTRY_HALF_WIDTH = 1.45
export const RAMP = { minZ: -15.8, maxZ: -14.7, height: STAGE.height }

export const HALF_WORLD = 18
export const PLAYER_RADIUS = 0.42
export const SPEED = 0.08

export const flowerColors = ['#f08aa4', '#ffe3a3', '#f9b3c6', '#ffffff', '#d995c3']
