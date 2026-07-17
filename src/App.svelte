<script lang="ts">
  import { onMount } from 'svelte'
  import { Canvas } from '@threlte/core'
  import Scene from './lib/components/threed/Scene.svelte'
  import InteractionHint from './lib/components/ui/InteractionHint.svelte'
  import NpcDialog from './lib/components/ui/NpcDialog.svelte'
  import GuestbookModal from './lib/components/ui/GuestbookModal.svelte'
  import WeddingStageModal from './lib/components/ui/WeddingStageModal.svelte'
  import MobileControls from './lib/components/ui/MobileControls.svelte'
  import LoadingScreen from './lib/components/ui/LoadingScreen.svelte'
  import AudioPlayer from './lib/components/ui/AudioPlayer.svelte'
  import { setLoaded, setGuestName, setPlayerLabel } from './lib/stores/gameState.svelte'
  import { screenLabels } from './lib/stores/labelStore.svelte'
  import { loadConfig } from './lib/stores/weddingConfig.svelte'

  onMount(() => {
    loadConfig()
    try {
      const params = new URLSearchParams(window.location.search)
      const raw = params.get('send')
      if (raw) {
        const titleCased = raw
          .trim()
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ')
        setGuestName(titleCased)
        setPlayerLabel(titleCased)
      }
    } catch {
      // Malformed percent-encoding — keep default guest name.
    }
    const t = setTimeout(() => setLoaded(true), 1500)
    return () => clearTimeout(t)
  })
</script>

<div class="relative h-screen w-full overflow-hidden bg-[#0c0a09]">
  <Canvas shadows>
    <Scene />
  </Canvas>

  <!-- 2D Label Overlay -->
  <div class="pointer-events-none absolute inset-0 overflow-hidden">
    {#each $screenLabels as label (label.id)}
      <div
        class="world-label absolute -translate-x-1/2 -translate-y-full"
        style="left: {label.x}px; top: {label.y}px; opacity: {label.behind ? 0 : 1}"
      >
        {label.text}
      </div>
    {/each}
  </div>

  <InteractionHint />
  <NpcDialog />
  <GuestbookModal />
  <WeddingStageModal />
  <MobileControls />
  <AudioPlayer />
  <LoadingScreen />
</div>
