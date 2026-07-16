import { writable } from 'svelte/store'

export interface ScreenLabel {
  id: string
  text: string
  x: number
  y: number
  behind: boolean
}

export interface LabelDef {
  id: string
  text: string
  world: [number, number, number]
}

export const labelDefs: LabelDef[] = [
  { id: 'receptionist', text: 'Resepsionis', world: [0, 2.45, -4.9] },
  { id: 'mailbox', text: 'Kotak Ucapan', world: [-5, 2.15, -10] },
  { id: 'guide', text: 'Pemandu Lokasi', world: [4, 2.45, -10] },
  { id: 'dinda', text: '💍 Dinda', world: [-0.72, 3.15, -18.6] },
  { id: 'reza', text: '💍 Reza', world: [0.72, 3.15, -18.6] }
]

export const screenLabels = writable<ScreenLabel[]>([])
