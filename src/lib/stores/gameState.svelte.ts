import { writable } from 'svelte/store'
import type { ModalType, NpcData, TriggerZone } from '../constants/triggers'
import { triggerZones } from '../constants/triggers'

export const isLoaded = writable(false)
export const activeModal = writable<ModalType>(null)
export const nearbyTrigger = writable<TriggerZone | null>(null)
export const activeNpcData = writable<NpcData | null>(null)
export const confettiActive = writable(false)
export const guestName = writable('Tamu Undangan')
export const playerLabel = writable('')

export function openModal(type: ModalType, npc?: NpcData) {
  activeModal.set(type)
  activeNpcData.set(npc ?? null)
  if (type === 'weddingStage') confettiActive.set(true)
}

export function closeModal() {
  activeModal.set(null)
  activeNpcData.set(null)
  confettiActive.set(false)
}

export function setNearbyTrigger(zone: TriggerZone | null) {
  nearbyTrigger.set(zone)
}

export function setLoaded(val: boolean) {
  isLoaded.set(val)
}

export function setGuestName(name: string) {
  guestName.set(name.trim() || 'Tamu Undangan')
}

export function setPlayerLabel(name: string) {
  playerLabel.set(name.trim())
}

export { triggerZones }
