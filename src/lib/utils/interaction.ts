import type { TriggerZone } from '../constants/triggers'
import { triggerZones } from '../constants/triggers'

export function getNearbyTrigger(
  px: number,
  pz: number
): TriggerZone | null {
  for (const zone of triggerZones) {
    const dx = px - zone.position[0]
    const dz = pz - zone.position[2]
    if (Math.hypot(dx, dz) <= zone.radius) return zone
  }
  return null
}
