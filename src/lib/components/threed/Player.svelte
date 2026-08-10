<script lang="ts">
  import { T, useTask } from '@threlte/core'
  import { useGltf, useGltfAnimations } from '@threlte/extras'
  import { untrack } from 'svelte'
  import * as THREE from 'three'
  import type { Appearance } from '../../utils/appearance'
  import { applyAppearance } from '../../utils/appearance'
  import { playerPos, playerAngle, playerMoving, playerSprinting, playerSpeed } from '../../stores/playerMovement.svelte'
  import { WALK_SPEED, RUN_SPEED } from '../../constants/triggers'

  import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

  let {
    url = '/models/tamu.glb',
    scale = 0.62,
    appearance = {},
    onReady,
    onError
  }: {
    url?: string
    scale?: number
    appearance?: Partial<Appearance>
    onReady?: () => void
    onError?: (error: unknown) => void
  } = $props()

  const gltf = untrack(() => useGltf(url, { meshoptDecoder: MeshoptDecoder }))
  const { actions } = useGltfAnimations(() => $gltf)

  let group = $state<THREE.Group>()
  let groundOffset = $state(0.08) // fallback, akan dikoreksi saat runtime

  // Hitung offset Y dari posisi bone Foot.L/Foot.R setelah animasi berjalan
  let offsetComputed = false
  const _v3 = new THREE.Vector3()

  // Idle / Walk / Run crossfade dengan referensi action aktif (untuk timeScale).
  let currentClip = 'Idle'
  let activeAction: THREE.AnimationAction | null = null
  $effect(() => {
    if (!$gltf) return
    const moving = $playerMoving
    const sprinting = $playerSprinting
    const nextClip = !moving ? 'Idle' : sprinting ? 'Run' : 'Walk'
    if (nextClip === currentClip) return
    const next = $actions?.[nextClip]
    const prev = $actions?.[currentClip]
    if (next) next.reset().fadeIn(0.18).play()
    if (prev) prev.fadeOut(0.18)
    currentClip = nextClip
    activeAction = next ?? null
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

    // Skala kecepatan animasi mengikuti kecepatan gerak supaya langkah terasa
    // sinkron (lebih cepat saat lari, melambat saat deselerasi).
    if (activeAction) {
      if (currentClip === 'Walk') {
        activeAction.timeScale = THREE.MathUtils.clamp(playerSpeed.value / WALK_SPEED, 0.5, 1.4)
      } else if (currentClip === 'Run') {
        activeAction.timeScale = THREE.MathUtils.clamp(playerSpeed.value / RUN_SPEED, 0.6, 1.3)
      } else {
        activeAction.timeScale = 1
      }
    }
  })
</script>

<T.Group bind:ref={group} {scale}>
  {#await gltf then { scene }}
    <T
      is={scene}
      castShadow
      oncreate={(ref) => {
        applyAppearance(ref, appearance)
        onReady?.()
      }}
    />
  {:catch error}
    {onError?.(error)}
  {/await}
</T.Group>
