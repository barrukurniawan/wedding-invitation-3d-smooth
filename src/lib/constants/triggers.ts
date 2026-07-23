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
      avatar: '🛎',
      messages: [
        'Selamat datang di pernikahan 👰🏻 Kia & 🤵🏻 Toni! Silakan berjalan ke arah pelaminan.',
        'Jangan lupa memberikan ucapan 💌 di kotak ucapan ya! 📮'
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
      avatar: '🗺️',
      messages: [
        'Venue pernikahan berada di alamat yang tercantum di bawah ini. Gunakan tombol Maps untuk membuka rute lokasi.',
        'Setelah itu, silakan lanjut maju ke pelaminan untuk menyapa Kia & Toni.'
      ],
      venueAddress: 'Venue Pernikahan Kia & Toni',
      mapsUrl: 'https://maps.app.goo.gl/uvFSZDLTFFYxuwGP7'
    }
  }
]

// === Light pole system (data-driven, shared by Environment + collision) ===
export const LIGHT_POLE_OFFSET = 4.0
export const LIGHT_POLE_Z_POSITIONS = [4, -1, -6, -11, -14]
export const LIGHT_POLE_HOOK_HEIGHT = 3.8
export const LIGHT_POLE_HOOK_REACH = 0.35
export const LIGHT_POLE_COLLISION_RADIUS = 0.35

export type LightPoleSide = 'left' | 'right'

export interface LightPoleConfig {
  id: string
  side: LightPoleSide
  position: [number, number, number]
  hookWorld: [number, number, number]
  variant: 'endpoint' | 'middle'
}

export const lightPoles: LightPoleConfig[] = (() => {
  const poles: LightPoleConfig[] = []
  for (const side of ['left', 'right'] as const) {
    const x = side === 'left' ? -LIGHT_POLE_OFFSET : LIGHT_POLE_OFFSET
    const dir = side === 'left' ? 1 : -1
    LIGHT_POLE_Z_POSITIONS.forEach((z, i) => {
      const hookX = x + dir * LIGHT_POLE_HOOK_REACH
      poles.push({
        id: `pole_${side}_${i}`,
        side,
        position: [x, 0, z],
        hookWorld: [hookX, LIGHT_POLE_HOOK_HEIGHT, z],
        variant: i === 0 || i === LIGHT_POLE_Z_POSITIONS.length - 1 ? 'endpoint' : 'middle'
      })
    })
  }
  return poles
})()

export const lightPoleColliders = lightPoles.map((p) => ({
  minX: p.position[0] - LIGHT_POLE_COLLISION_RADIUS,
  maxX: p.position[0] + LIGHT_POLE_COLLISION_RADIUS,
  minZ: p.position[2] - LIGHT_POLE_COLLISION_RADIUS,
  maxZ: p.position[2] + LIGHT_POLE_COLLISION_RADIUS
}))

export const colliders = [
  // Light poles (prevent walking through 10 poles)
  ...lightPoleColliders,
  // Meja resepsionis (world bounds menyam ukuran meja baru: x~3.58-4.42, z~-5.3-2.7)
  { minX: 3.5, maxX: 4.45, minZ: -5.3, maxZ: -2.7 },
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

// === Movement tuning (units are in *seconds*, frame-rate independent) ===
// Legacy per-frame SPEED is kept for reference; movement now uses WALK/RUN below.
export const SPEED = 0.08
export const WALK_SPEED = 4.8 // units / second
export const RUN_SPEED = 8.4 // units / second (sprint)
export const ACCEL_LAMBDA = 10 // velocity approach rate while input held
export const DECEL_LAMBDA = 14 // velocity decay rate when input released
export const ROT_LAMBDA = 12 // character turn smoothing rate
export const SPRINT_JOY_THRESHOLD = 0.9 // joystick magnitude that triggers run
export const VEL_DEAD = 0.02 // below this speed, snap velocity to zero

export const flowerColors = ['#f08aa4', '#ffe3a3', '#f9b3c6', '#ffffff', '#d995c3']
