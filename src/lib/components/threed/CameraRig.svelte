<script lang="ts">
  import { T, useTask } from '@threlte/core'
  import * as THREE from 'three'
  import { playerPos } from '../../stores/playerMovement.svelte'

  let camera = $state<THREE.PerspectiveCamera>()

  const camPos = { x: 0, y: 5.8, z: 7.8 }
  const lookTarget = new THREE.Vector3()

  useTask(() => {
    if (!camera) return
    camPos.x += (playerPos.x - camPos.x) * 0.08
    camPos.y += (playerPos.y + 5.8 - camPos.y) * 0.08
    camPos.z += (playerPos.z + 7.8 - camPos.z) * 0.08
    camera.position.set(camPos.x, camPos.y, camPos.z)
    lookTarget.set(playerPos.x, playerPos.y + 1.1, playerPos.z)
    camera.lookAt(lookTarget)
  })
</script>

<T.PerspectiveCamera bind:ref={camera} makeDefault position={[0, 5.8, 7.8]} fov={50} near={0.1} far={120} />
