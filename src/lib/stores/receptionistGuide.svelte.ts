import { writable } from 'svelte/store'

// Posisi screen-space resepsionis, diupdate setiap frame dari dalam Canvas
export const receptionistScreenPos = writable<{ x: number; y: number; visible: boolean } | null>(null)
