<script lang="ts">
  import * as THREE from 'three'
  import { useTask, useThrelte } from '@threlte/core'
  import { SoftShadows } from '@threlte/extras'
  import { onDestroy, onMount, type Component } from 'svelte'
  import CameraRig from './CameraRig.svelte'
  import Lighting from './Lighting.svelte'
  import Sky from './Sky.svelte'
  import Player from './Player.svelte'
  import Npcs from './Npcs.svelte'
  import Confetti from './Confetti.svelte'
  import Labels from './Labels.svelte'
  import { tick, playerPos } from '../../stores/playerMovement.svelte'
  import { setNearbyTrigger } from '../../stores/gameState.svelte'
  import { getNearbyTrigger } from '../../utils/interaction'
  import { bumpCriticalLoaded } from '../../stores/loadProgress.svelte'

  const { scene } = useThrelte()

  let {
    lowPower = false,
    onReady
  }: {
    lowPower?: boolean
    onReady?: () => void
  } = $props()

  let playerReady = $state(false)
  let receptionistReady = $state(false)
  let envCriticalReady = $state(false)
  let loadWeddingCouple = $state(false)
  let Environment = $state<Component>()
  let readySent = false
  let deferredCoupleHandle: number | null = null

  onMount(() => {
    void import('./Environment.svelte').then((module) => {
      Environment = module.default
    })
  })

  $effect(() => {
    if (!playerReady || !receptionistReady || !envCriticalReady || readySent) return
    readySent = true
    requestAnimationFrame(() => requestAnimationFrame(() => {
      onReady?.()
      const loadCouple = () => { loadWeddingCouple = true }
      if ('requestIdleCallback' in window) {
        deferredCoupleHandle = window.requestIdleCallback(loadCouple, { timeout: 350 })
      } else {
        deferredCoupleHandle = globalThis.setTimeout(loadCouple, 120)
      }
    }))
  })

  onDestroy(() => {
    if (deferredCoupleHandle === null) return
    if ('cancelIdleCallback' in window) window.cancelIdleCallback(deferredCoupleHandle)
    else clearTimeout(deferredCoupleHandle)
  })

  // Fallback background + fog horizon yang menyatu dengan sky dome.
  // lowPower: slightly closer fog far plane (less fill cost)
  $effect(() => {
    scene.background = new THREE.Color('#8ed3f7')
    scene.fog = new THREE.Fog('#dff3fb', lowPower ? 26 : 32, lowPower ? 55 : 68)
  })

  // Render loop utama: gerakan -> deteksi proximity
  useTask((delta: number) => {
    tick(delta)
    setNearbyTrigger(getNearbyTrigger(playerPos.x, playerPos.z))
  })
</script>

{#if !lowPower}
  <SoftShadows size={28} samples={12} focus={0.6} />
{/if}

<CameraRig />
<Sky {lowPower} />
<Lighting shadows={!lowPower} />
{#if Environment}
  <Environment
    {lowPower}
    onReady={() => {
      if (envCriticalReady) return
      envCriticalReady = true
      bumpCriticalLoaded()
    }}
  />
{/if}
<Player
  appearance={{ skin: '#f0c8a0', hair: '#1a1a1a', black: '#1a1a1a', shirt: '#ffffff', details: '#d4af37', shoes: '#1a1a1a' }}
  onReady={() => {
    if (playerReady) return
    playerReady = true
    bumpCriticalLoaded()
  }}
/>
<Npcs
  {loadWeddingCouple}
  onReceptionistReady={() => {
    if (receptionistReady) return
    receptionistReady = true
    bumpCriticalLoaded()
  }}
/>
<Confetti />
<Labels />
