<script lang="ts">
  import { T, useTask } from '@threlte/core'
  import { useGltf, useGltfAnimations } from '@threlte/extras'
  import { untrack } from 'svelte'
  import * as THREE from 'three'
  import type { Appearance } from '../../utils/appearance'
  import { applyAppearance } from '../../utils/appearance'
  import { playerPos, playerAngle, playerMoving } from '../../stores/playerMovement.svelte'

  let {
    url = '/models/tamu.gltf',
    scale = 0.62,
    appearance = {}
  }: { url?: string; scale?: number; appearance?: Partial<Appearance> } = $props()

  const gltf = untrack(() => useGltf(url))
  const { actions } = useGltfAnimations(() => $gltf)

  let group = $state<THREE.Group>()
  let groundOffset = $state(0.08) // fallback, akan dikoreksi saat runtime

  // Hitung offset Y dari posisi bone Foot.L/Foot.R setelah animasi berjalan
  let offsetComputed = false
  const _v3 = new THREE.Vector3()

  // Walk / Idle crossfade
  let currentClip = 'Idle'
  $effect(() => {
    if (!$gltf) return
    const moving = $playerMoving
    const nextClip = moving ? 'Walk' : 'Idle'
    if (nextClip === currentClip) return
    const next = $actions?.[nextClip]
    const prev = $actions?.[currentClip]
    if (next) next.reset().fadeIn(0.15).play()
    if (prev) prev.fadeOut(0.15)
    currentClip = nextClip
  })

  $effect(() => {
    if (!$gltf) return
    $actions?.['Idle']?.reset().play()
  })

  useTask(() => {
    if (!group) return

    // Setelah beberapa frame, hitung offset dari bone kaki sebenarnya
    if (!offsetComputed && group) {
      group.updateMatrixWorld(true)
      let minFootY = Infinity
      group.traverse((obj) => {
        const bone = obj as THREE.Bone
        if (bone.isBone && (bone.name === 'Foot.L' || bone.name === 'Foot.R')) {
          bone.getWorldPosition(_v3)
          minFootY = Math.min(minFootY, _v3.y)
        }
      })
      if (minFootY !== Infinity && minFootY < 0.5) {
        // Bone kaki di minFootY (model space); mesh kaki ~0.04 di bawah bone
        // Perlu: groupY + (minFootY - 0.04) * scale = 0.01 (sedikit di atas tanah)
        groundOffset = (-minFootY + 0.04) * scale + 0.02
        offsetComputed = true
      }
    }

    group.position.set(playerPos.x, playerPos.y + groundOffset, playerPos.z)
    group.rotation.y = playerAngle.value
  })
</script>

<T.Group bind:ref={group} {scale}>
  {#await gltf then { scene }}
    <T
      is={scene}
      castShadow
      oncreate={(ref) => {
        applyAppearance(ref, appearance)
      }}
    />
  {/await}
</T.Group>
