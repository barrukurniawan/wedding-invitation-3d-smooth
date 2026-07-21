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
}

export const labelDefs: LabelDef[] = [
  { id: 'receptionist', text: 'Tujuan awal: Resepsionis', world: [4.9, 2.45, -4], objective: true },
  { id: 'mailbox', text: 'Kotak Ucapan', world: [-5, 2.15, -10] },
  { id: 'guide', text: 'Pemandu Lokasi', world: [4, 2.45, -10] },
  { id: 'Kia', text: 'Kia', world: [-0.72, 3.15, -18.6] },
  { id: 'Toni', text: 'Toni', world: [0.72, 3.15, -18.6] }
]

export const screenLabels = writable<ScreenLabel[]>([])
