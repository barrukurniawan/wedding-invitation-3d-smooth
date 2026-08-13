import { writable } from 'svelte/store'
import { browser } from '$app/environment'
import {
  colliders,
  STAGE,
  STAGE_ENTRY_HALF_WIDTH,
  RAMP,
  RUN_ZONE_MIN_X,
  HALF_WORLD,
  PLAYER_RADIUS,
  WALK_SPEED,
  RUN_SPEED,
  ACCEL_LAMBDA,
  DECEL_LAMBDA,
  ROT_LAMBDA,
  SPRINT_JOY_THRESHOLD,
  VEL_DEAD
} from '../constants/triggers'
import { dampAngle } from '../utils/damp'

export const playerPos = { x: 0, y: 0, z: 5 }
export const playerAngle = { value: Math.PI }
export const playerSpeed = { value: 0 }
export const playerMoving = writable(false)
export const playerSprinting = writable(false)
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

// Current velocity in units / second (accelerated & decelerated toward input).
const vel = { x: 0, z: 0 }

import { get } from 'svelte/store'
import { hasStarted } from './gameState.svelte'

export function tick(delta: number) {
  // Clamp delta so a long frame (e.g. tab refocus) cannot teleport the player.
  const dt = Math.min(delta, 0.05)
  const canMove = get(hasStarted)

  let ix = 0
  let iz = 0

  if (canMove) {
    if (keys['KeyW'] || keys['ArrowUp']) iz -= 1
    if (keys['KeyS'] || keys['ArrowDown']) iz += 1
    if (keys['KeyA'] || keys['ArrowLeft']) ix -= 1
    if (keys['KeyD'] || keys['ArrowRight']) ix += 1

    ix += joystickDelta.x
    iz += joystickDelta.z
  }

  const raw = Math.sqrt(ix * ix + iz * iz)
  const inputMag = Math.min(1, raw)
  const hasInput = raw > 0.001

  // Sprint: Shift on keyboard, or joystick pushed near its limit.
  const joyMag = Math.sqrt(joystickDelta.x * joystickDelta.x + joystickDelta.z * joystickDelta.z)
  const sprinting = (keys['ShiftLeft'] || keys['ShiftRight']) || joyMag > SPRINT_JOY_THRESHOLD

  // Normalized direction (diagonal not faster).
  const dirX = hasInput ? ix / raw : 0
  const dirZ = hasInput ? iz / raw : 0

  // Larang sprint di zona sakral (karpet merah, ramp, dan pelaminan).
  // Deteksi dilakukan dengan 3 perbandingan aritmatika — overhead nol.
  const canSprint = !isInWalkOnlyZone(playerPos.x, playerPos.z)
  const targetSpeed = (sprinting && canSprint ? RUN_SPEED : WALK_SPEED) * inputMag
  const tvx = dirX * targetSpeed
  const tvz = dirZ * targetSpeed

  // Frame-rate-independent accel/decel toward target velocity.
  const lambda = hasInput ? ACCEL_LAMBDA : DECEL_LAMBDA
  const k = 1 - Math.exp(-lambda * dt)
  vel.x += (tvx - vel.x) * k
  vel.z += (tvz - vel.z) * k

  const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z)
  if (!hasInput && speed < VEL_DEAD) {
    vel.x = 0
    vel.z = 0
  }

  // Integrate position with collision + slide-along-wall.
  const dx = vel.x * dt
  const dz = vel.z * dt
  const nextX = Math.max(-HALF_WORLD, Math.min(HALF_WORLD, playerPos.x + dx))
  // Restrict positive Z (backward) to 9 so they don't fall off the shortened ground.
  // Stage is at Z=-18 and beyond, so let negative Z go up to -22 safely.
  const nextZ = Math.max(-22, Math.min(9, playerPos.z + dz))

  if (canMoveTo(nextX, nextZ)) {
    playerPos.x = nextX
    playerPos.z = nextZ
  } else if (canMoveTo(nextX, playerPos.z)) {
    playerPos.x = nextX
    vel.z = 0
  } else if (canMoveTo(playerPos.x, nextZ)) {
    playerPos.z = nextZ
    vel.x = 0
  } else {
    vel.x = 0
    vel.z = 0
  }

  // Smoothly turn toward the movement direction (shortest path) while moving.
  if (hasInput) {
    const targetAngle = Math.atan2(dirX, dirZ)
    playerAngle.value = dampAngle(playerAngle.value, targetAngle, ROT_LAMBDA, dt)
  }

  playerSpeed.value = speed
  const moving = speed > 0.05
  playerMoving.set(moving)
  playerSprinting.set(moving && sprinting)

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
function isInWalkOnlyZone(x: number, z: number): boolean {
  // Hanya area pepohonan sisi luar yang boleh berlari
  if (Math.abs(x) >= RUN_ZONE_MIN_X) return false
  // Seluruh venue = walk-only
  return true
}
