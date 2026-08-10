<script lang="ts">
  import { T, useTask } from '@threlte/core'
  import { useGltf, useGltfAnimations } from '@threlte/extras'
  import { untrack } from 'svelte'
  import * as THREE from 'three'
  import type { Appearance } from '../../utils/appearance'
  import { applyAppearance } from '../../utils/appearance'
  import { createWaveClip, createNodClip } from '../../utils/waveAnimation'
  import BridalVeil from './BridalVeil.svelte'

  import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

  let {
    url,
    position = [0, 0, 0],
    rotationY = 0,
    scale = 1,
    clip = 'Idle',
    appearance = {},
    useWave = false,
    useNod = false,
    weddingSkirt = false,
    bridalVeil = false,
    onReady,
    onError
  }: {
    url: string
    position?: [number, number, number]
    rotationY?: number
    scale?: number
    clip?: string
    appearance?: Partial<Appearance>
    useWave?: boolean
    useNod?: boolean
    weddingSkirt?: boolean
    bridalVeil?: boolean
    onReady?: () => void
    onError?: (error: unknown) => void
  } = $props()

  const gltf = untrack(() => useGltf(url, { meshoptDecoder: MeshoptDecoder }))
  const { actions } = useGltfAnimations(() => $gltf)

  let group = $state<THREE.Group>()
  let waveMixer: THREE.AnimationMixer | null = null
  let nodMixer: THREE.AnimationMixer | null = null
  let yAdjust = $state(0)
  let offsetComputed = false
  const _v3 = new THREE.Vector3()

  $effect(() => {
    if (!$gltf || !group) return
    const a = $actions?.[clip]
    if (a) {
      a.reset().fadeIn(0.2).play()
    }

    if (useWave && group && !waveMixer) {
      waveMixer = new THREE.AnimationMixer(group)
      const waveClip = createWaveClip()
      const action = waveMixer.clipAction(waveClip)
      action.setLoop(THREE.LoopRepeat, Infinity)
      action.fadeIn(0.3).play()
    }

    if (useNod && group && !nodMixer) {
      nodMixer = new THREE.AnimationMixer(group)
      nodMixer.timeScale = 0.1
      const nodClip = createNodClip()
      const action = nodMixer.clipAction(nodClip)
      action.setLoop(THREE.LoopRepeat, Infinity)
      action.fadeIn(0.3).play()
    }
  })

  useTask((delta: number) => {
    waveMixer?.update(delta)
    nodMixer?.update(delta)
    if (!group) return
    if (!offsetComputed) {
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
        yAdjust = (-minFootY + 0.04) * scale + 0.02
        offsetComputed = true
      }
    }
  }, {
    running: () => !offsetComputed || useWave || useNod
  })
</script>

<T.Group
  bind:ref={group}
  position={[position[0], position[1] + yAdjust, position[2]]}
  rotation.y={rotationY}
  {scale}
>
  {#await gltf then { scene }}
    <T
      is={scene}
      castShadow
      oncreate={(ref) => {
        applyAppearance(ref, appearance)
        onReady?.()
      }}
    />
    {#if bridalVeil}
      <BridalVeil root={scene} />
    {/if}
  {:catch error}
    {onError?.(error)}
  {/await}

  {#if weddingSkirt}
    <T.Group position={[0, 0.7, 0]}>
      <T.Mesh castShadow receiveShadow>
        <T.CylinderGeometry args={[0.36, 1.18, 1.46, 32]} />
        <T.MeshStandardMaterial color="#fffdf8" roughness={0.82} />
      </T.Mesh>
      <T.Mesh position={[0, -0.71, 0]} rotation.x={Math.PI / 2} castShadow>
        <T.TorusGeometry args={[1.12, 0.075, 8, 32]} />
        <T.MeshStandardMaterial color="#f2e9df" roughness={0.85} />
      </T.Mesh>
    </T.Group>
  {/if}
</T.Group>
