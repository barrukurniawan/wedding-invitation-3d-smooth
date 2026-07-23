<script lang="ts">
  import * as THREE from 'three'
  import { useTask, useThrelte } from '@threlte/core'
  import { SoftShadows } from '@threlte/extras'
  import { onMount, type Component } from 'svelte'
  import CameraRig from './CameraRig.svelte'
  import Lighting from './Lighting.svelte'
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
  let npcsReady = $state(false)
  let envCriticalReady = $state(false)
  let Environment = $state<Component>()
  let readySent = false

  onMount(() => {
    void import('./Environment.svelte').then((module) => {
      Environment = module.default
    })
  })

  $effect(() => {
    if (!playerReady || !npcsReady || !envCriticalReady || readySent) return
    readySent = true
    requestAnimationFrame(() => requestAnimationFrame(() => onReady?.()))
  })

  // Background langit hangat + fog lembut ala Summer Afternoon
  // lowPower: slightly closer fog far plane (less fill cost)
  $effect(() => {
    scene.background = new THREE.Color('#bfe3f0')
    scene.fog = new THREE.Fog('#fcd9a0', lowPower ? 14 : 18, lowPower ? 42 : 54)
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
  onReady={() => {
    if (npcsReady) return
    npcsReady = true
    bumpCriticalLoaded(4)
  }}
/>
<Confetti />
<Labels />
