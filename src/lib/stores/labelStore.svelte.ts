import { writable } from 'svelte/store'

export interface ScreenLabel {
  id: string
  text: string
  x: number
  y: number
  behind: boolean
  opacity: number
  objective: boolean
}

export interface LabelDef {
  id: string
  text: string
  world: [number, number, number]
  objective?: boolean
  showBeforeMove?: boolean
}

export const labelDefs: LabelDef[] = [
  { id: 'receptionist', text: 'Resepsionis', world: [4.9, 2.45, -10], objective: true, showBeforeMove: true },
  { id: 'mailbox', text: 'Kotak Ucapan', world: [-5, 2.15, -10], showBeforeMove: true },
  { id: 'bride', text: '{bride}', world: [-0.72, 3.15, -18.6] },
  { id: 'groom', text: '{groom}', world: [0.72, 3.15, -18.6] }
]

export const screenLabels = writable<ScreenLabel[]>([])
