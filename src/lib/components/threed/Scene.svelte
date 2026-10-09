<script lang="ts">
  import * as THREE from 'three'
  import { useTask, useThrelte } from '@threlte/core'
  import { interactivity } from '@threlte/extras'
  import { onMount, type Component } from 'svelte'

  interactivity()
  import CameraRig from './CameraRig.svelte'
  import Lighting from './Lighting.svelte'
  import Sky from './Sky.svelte'
  import Player from './Player.svelte'
  import Npcs from './Npcs.svelte'
  import Confetti from './Confetti.svelte'
import Labels from './Labels.svelte'
  import RenderDiagnostics from './RenderDiagnostics.svelte'
  import { tick, playerPos, setLightPoleCollidersEnabled } from '../../stores/playerMovement.svelte'
import { setNearbyTrigger, setSceneLoadError, guestGender } from '../../stores/gameState.svelte'
  import { getNearbyTrigger } from '../../utils/interaction'
  import { bumpCriticalLoaded } from '../../stores/loadProgress.svelte'
  import { resolveVenue, type SurroundingsProps } from '../../venues'
  import { weddingConfig } from '../../stores/weddingConfig.svelte'
  import { get } from 'svelte/store'

  const { scene } = useThrelte()

  let {
    lowPower = false,
    renderQuality = 'desktop',
    onReady
  }: {
    lowPower?: boolean
    renderQuality?: 'mobile' | 'desktop' | 'desktop-retina'
    onReady?: () => void
  } = $props()

  let playerReady = $state(false)
  let receptionistReady = $state(false)
  let envCriticalReady = $state(false)
  let Environment = $state<typeof import('./Environment.svelte').default>()
  let Surroundings = $state<Component<SurroundingsProps>>()
  let readySent = false
  let lastTriggerId: string | null = null

  // Venue dibaca sekali saat scene dibuat (config sudah dimuat TenantBootstrap).
  // Dev-only: `?venue=beach` untuk mencoba venue tanpa mengubah database.
  const devVenue = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('venue') : null
  const venue = resolveVenue(devVenue ?? get(weddingConfig).venue)
  setLightPoleCollidersEnabled(venue.theme.coreLayout?.lightPoles ?? true)

  onMount(() => {
    // Muat inti venue dan sekelilingnya paralel supaya tidak ada round-trip berantai.
    void Promise.all([import('./Environment.svelte'), venue.loadSurroundings()]).then(([env, surroundings]) => {
      Surroundings = surroundings.default
      Environment = env.default
    })
  })

  $effect(() => {
    if (!playerReady || !receptionistReady || !envCriticalReady || readySent) return
    readySent = true
    requestAnimationFrame(() => requestAnimationFrame(() => {
      onReady?.()
    }))
  })

  // Fallback background + fog horizon yang menyatu dengan sky dome.
  // lowPower: slightly closer fog far plane (less fill cost)
  $effect(() => {
    const { background, fog } = venue.theme
    scene.background = new THREE.Color(background)
    scene.fog = new THREE.Fog(fog.color, lowPower ? fog.nearLowPower : fog.near, lowPower ? fog.farLowPower : fog.far)
  })

  // Render loop utama: gerakan -> deteksi proximity
  useTask((delta: number) => {
    tick(delta)
    const trigger = getNearbyTrigger(playerPos.x, playerPos.z)
    const triggerId = trigger?.id ?? null
    if (triggerId !== lastTriggerId) {
      lastTriggerId = triggerId
      setNearbyTrigger(trigger)
    }
  })
</script>

<CameraRig />
<Sky {lowPower} colors={venue.theme.sky} />
<Lighting lighting={venue.theme.lighting} />
{#if Environment && Surroundings}
  <Environment
    {lowPower}
    {renderQuality}
    {Surroundings}
    palette={venue.theme.corePalette}
    layout={venue.theme.coreLayout}
    onReady={() => {
      if (envCriticalReady) return
      envCriticalReady = true
      bumpCriticalLoaded()
    }}
  />
{/if}
{#key $guestGender}
  <Player
    url={$guestGender === 'female' ? '/models/tamu-wanita.glb' : '/models/tamu.glb'}
    appearance={$guestGender === 'female' 
      ? { skin: '#f0c8a0', hair: '#e5c965', black: '#5c3a1b', pants: '#5c3a1b', clothes: (import.meta.env.VITE_FEMALE_JACKET_COLOR as string) || '#0077be', details: '#d4af37', shoes: '#1a1a1a' } 
      : { skin: '#f0c8a0', hair: '#1a1a1a', black: '#1a1a1a', shirt: '#ffffff', details: '#d4af37', shoes: '#1a1a1a' }
    }
    onReady={() => {
      if (playerReady) return
      playerReady = true
      bumpCriticalLoaded()
    }}
    onError={() => setSceneLoadError('Player model failed')}
  />
{/key}
<Npcs
  loadWeddingCouple={true}
  onReceptionistReady={() => {
    if (receptionistReady) return
    receptionistReady = true
    bumpCriticalLoaded()
  }}
  onGroomReady={() => {
    // Non-critical: loads in background, does not block loading screen
  }}
  onBrideReady={() => {
    // Non-critical: loads in background, does not block loading screen
  }}
  onError={() => setSceneLoadError('NPC model failed')}
/>
<Confetti {lowPower} />
<Labels />
<RenderDiagnostics />
