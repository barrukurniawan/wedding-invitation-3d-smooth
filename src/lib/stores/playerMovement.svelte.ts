import { writable } from 'svelte/store'
import { browser } from '$app/environment'
import {
  colliders,
  STAGE,
  STAGE_ENTRY_HALF_WIDTH,
  RAMP,
  HALF_WORLD,
  PLAYER_RADIUS,
  SPEED
} from '../constants/triggers'

export const playerPos = { x: 0, y: 0, z: 2 }
export const playerAngle = { value: 0 }
export const playerMoving = writable(false)
export const joystickDelta = { x: 0, z: 0 }

const keys: Record<string, boolean> = {}

if (browser) {
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true
  })
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false
  })
}

export function tick() {
  let dx = 0
  let dz = 0

  if (keys['KeyW'] || keys['ArrowUp']) dz -= 1
  if (keys['KeyS'] || keys['ArrowDown']) dz += 1
  if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1
  if (keys['KeyD'] || keys['ArrowRight']) dx += 1

  dx += joystickDelta.x
  dz += joystickDelta.z

  if (dx !== 0 || dz !== 0) {
    playerMoving.set(true)
    const len = Math.sqrt(dx * dx + dz * dz)
    const moveX = (dx / len) * SPEED
    const moveZ = (dz / len) * SPEED

    playerAngle.value = Math.atan2(dx, dz)
    const nextX = Math.max(-HALF_WORLD, Math.min(HALF_WORLD, playerPos.x + moveX))
    const nextZ = Math.max(-HALF_WORLD, Math.min(HALF_WORLD, playerPos.z + moveZ))

    if (canMoveTo(nextX, nextZ)) {
      playerPos.x = nextX
      playerPos.z = nextZ
    } else if (canMoveTo(nextX, playerPos.z)) {
      playerPos.x = nextX
    } else if (canMoveTo(playerPos.x, nextZ)) {
      playerPos.z = nextZ
    }
  } else {
    playerMoving.set(false)
  }

  playerPos.y = groundHeightAt(playerPos.x, playerPos.z)
}

function isOnStage(x: number, z: number) {
  return x > STAGE.minX && x < STAGE.maxX && z > STAGE.minZ && z < STAGE.maxZ
}

function isOnRamp(x: number, z: number) {
  return Math.abs(x) <= STAGE_ENTRY_HALF_WIDTH && z >= RAMP.minZ && z <= RAMP.maxZ
}

function groundHeightAt(x: number, z: number) {
  if (isOnStage(x, z)) return STAGE.height
  if (!isOnRamp(x, z)) return 0
  return ((RAMP.maxZ - z) / (RAMP.maxZ - RAMP.minZ)) * RAMP.height
}

function overlapsCollider(x: number, z: number, c: typeof colliders[number]) {
  return (
    x + PLAYER_RADIUS > c.minX &&
    x - PLAYER_RADIUS < c.maxX &&
    z + PLAYER_RADIUS > c.minZ &&
    z - PLAYER_RADIUS < c.maxZ
  )
}

function canMoveTo(x: number, z: number) {
  if (colliders.some((c) => overlapsCollider(x, z, c))) return false

  const currentOnStage = isOnStage(playerPos.x, playerPos.z)
  const nextOnStage = isOnStage(x, z)

  if (!currentOnStage && nextOnStage) {
    return isOnRamp(x, playerPos.z)
  }

  if (currentOnStage && !nextOnStage) {
    return isOnRamp(playerPos.x, z)
  }

  return true
}
