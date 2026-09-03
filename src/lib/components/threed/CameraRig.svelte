<script lang="ts">
  import { onMount } from 'svelte'
  import { T, useTask } from '@threlte/core'
  import * as THREE from 'three'
  import { playerPos, playerSpeed } from '../../stores/playerMovement.svelte'
  import { getOccluderGroup } from '../../stores/cameraOccluders.svelte'
  import { damp } from '../../utils/damp'

  let camera = $state<THREE.PerspectiveCamera>()

  // Third-person chase rig: lower & closer than the old debug-style camera so
  // the player reads as the subject instead of a top-down observation shot.
  const CAM_HEIGHT = 3.2
  const CAM_DISTANCE = 6.5
  const MOBILE_CAM_DISTANCE = 8
  const MOBILE_FOV = 58
  const MOBILE_LOOK_AHEAD = 3.4
  const CAM_LAMBDA = 4.2 // critically-damped follow (slight, stable lag)
  const LOOK_OFFSET = 1.35 // aim at the chest/upper body
  const GROUND_MIN = 0.8 // never dip the camera under the ground plane
  const COLLISION_NEAR = 0.6 // skip the player's own body when raycasting
  const COLLISION_MARGIN = 0.35 // keep the camera slightly in front of occluders
  const COLLISION_LAMBDA = 8 // smoothing rate for collision distance (anti-jitter)

  const camPos = new THREE.Vector3(
    playerPos.x,
    playerPos.y + CAM_HEIGHT,
    playerPos.z + CAM_DISTANCE
  )
  const desired = new THREE.Vector3()
  const lookTarget = new THREE.Vector3()
  const dir = new THREE.Vector3()
  const ray = new THREE.Raycaster()

  let collisionDist = CAM_DISTANCE
  let isMobile = $state(false)

  onMount(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const updateViewport = () => {
      isMobile = media.matches
      collisionDist = isMobile ? MOBILE_CAM_DISTANCE : CAM_DISTANCE
    }
    updateViewport()
    media.addEventListener('change', updateViewport)
    return () => media.removeEventListener('change', updateViewport)
  })

  useTask((delta: number) => {
    if (!camera) return
    const dt = Math.min(delta, 0.05)

    const cameraDistance = isMobile ? MOBILE_CAM_DISTANCE : CAM_DISTANCE
    desired.set(
      playerPos.x,
      playerPos.y + CAM_HEIGHT,
      playerPos.z + cameraDistance
    )
    camPos.x = damp(camPos.x, desired.x, CAM_LAMBDA, dt)
    camPos.y = damp(camPos.y, desired.y, CAM_LAMBDA, dt)
    camPos.z = damp(camPos.z, desired.z, CAM_LAMBDA, dt)

    lookTarget.set(
      playerPos.x,
      playerPos.y + LOOK_OFFSET,
      playerPos.z - (isMobile ? MOBILE_LOOK_AHEAD : 0)
    )

    // Spring-arm collision: tarik kamera mendekat bila ada penghalang antara
    // look target dan posisi kamera. Hanya menembak grup PROXY occluder (~6
    // kotak invisible di Environment), BUKAN seluruh scene — menembak seluruh
    // scene (ratusan klon glTF vegetasi) membebani memori/GC (~600MB). Hanya
    // jalan saat pemain bergerak; saat diam pakai hasil terakhir.
    const occluders = getOccluderGroup()
    if (playerSpeed.value > 0.05 && occluders) {
      dir.copy(camPos).sub(lookTarget)
      const dist = dir.length()
      if (dist > 0.001) {
        dir.normalize()
        ray.set(lookTarget, dir)
        ray.near = COLLISION_NEAR
        ray.far = dist
        const hits = ray.intersectObject(occluders, true)
        const solid = hits.length ? hits[0] : null
        const target = solid && solid.distance < dist
          ? Math.max(COLLISION_MARGIN + 0.2, solid.distance - COLLISION_MARGIN)
          : cameraDistance
        // Haluskan jarak collision supaya transisi tidak snap (anti zoom glitch).
        collisionDist = damp(collisionDist, target, COLLISION_LAMBDA, dt)
      }
    }

    // Apply collision by clamping the camera along the look-to-cam direction.
    dir.copy(camPos).sub(lookTarget)
    const curDist = dir.length()
    if (curDist > 0.001 && collisionDist < cameraDistance) {
      dir.normalize()
      const clamped = Math.min(curDist, collisionDist)
      camPos.copy(lookTarget).addScaledVector(dir, clamped)
    }

    if (camPos.y < GROUND_MIN) camPos.y = GROUND_MIN

    camera.position.copy(camPos)
    camera.lookAt(lookTarget)
  })
</script>

<T.PerspectiveCamera
  bind:ref={camera}
  makeDefault
  position={[playerPos.x, playerPos.y + CAM_HEIGHT, playerPos.z + CAM_DISTANCE]}
  fov={isMobile ? MOBILE_FOV : 50}
  near={0.1}
  far={120}
/>
