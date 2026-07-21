<script lang="ts">
  import * as THREE from 'three'
  import { useTask, useThrelte } from '@threlte/core'
  import { SoftShadows } from '@threlte/extras'
  import { onMount, type Component } from 'svelte'
  import CameraRig from './CameraRig.svelte'
  import Lighting from './Lighting.svelte'
  import Player from './Player.svelte'
  import Confetti from './Confetti.svelte'
  import Labels from './Labels.svelte'
  import { tick, playerPos } from '../../stores/playerMovement.svelte'
  import { setNearbyTrigger, confettiActive } from '../../stores/gameState.svelte'
  import { getNearbyTrigger } from '../../utils/interaction'

  const { scene } = useThrelte()

  const isMobile = typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent)

  let playerReady = $state(false)
  let Environment = $state<Component>()
  let Npcs = $state<Component>()

  onMount(() => {
    void import('./Environment.svelte').then((module) => {
      Environment = module.default
    })
  })

  $effect(() => {
    if (!playerReady) return
    const t = setTimeout(() => {
      void import('./Npcs.svelte').then((module) => {
        Npcs = module.default
      })
    }, 500)
    return () => clearTimeout(t)
  })

  // Background langit hangat + fog lembut ala Summer Afternoon
  $effect(() => {
    scene.background = new THREE.Color('#bfe3f0')
    scene.fog = new THREE.Fog('#fcd9a0', 18, 54)
  })

  // Render loop utama: gerakan -> deteksi proximity
  useTask((delta: number) => {
    tick(delta)
    setNearbyTrigger(getNearbyTrigger(playerPos.x, playerPos.z))
  })
</script>

<SoftShadows size={isMobile ? 16 : 28} samples={isMobile ? 4 : 12} focus={0.6} />

<CameraRig />
<Lighting />
{#if Environment}
  <Environment />
{/if}
<Player
  appearance={{ skin: '#f0c8a0', hair: '#1a1a1a', black: '#1a1a1a', shirt: '#ffffff', details: '#d4af37', shoes: '#1a1a1a' }}
  onReady={() => { playerReady = true }}
/>
{#if Npcs}
  <Npcs />
{/if}
<Confetti />
<Labels />
