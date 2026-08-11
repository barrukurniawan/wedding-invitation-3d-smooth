<script lang="ts">
  import { onMount, type Component } from 'svelte'
  import InteractionHint from './lib/components/ui/InteractionHint.svelte'
  import NpcDialog from './lib/components/ui/NpcDialog.svelte'
  import GuestbookModal from './lib/components/ui/GuestbookModal.svelte'
  import WeddingStageModal from './lib/components/ui/WeddingStageModal.svelte'
  import MobileControls from './lib/components/ui/MobileControls.svelte'
  import LoadingScreen from './lib/components/ui/LoadingScreen.svelte'
  import AudioPlayer from './lib/components/ui/AudioPlayer.svelte'
  import WeddingHero from './lib/components/ui/WeddingHero.svelte'
  import { setLoaded, setGuestName, setPlayerLabel, hasStarted, setGuestGender, setHasStarted } from './lib/stores/gameState.svelte'
  import { beginRealProgress, completeProgress } from './lib/stores/loadProgress.svelte'
  import { screenLabels } from './lib/stores/labelStore.svelte'

  let World = $state<Component>()
  let lowPower = $state(false)
  let sceneReady = $state(false)

  onMount(() => {
    beginRealProgress()
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
      
      // Auto gender selection
      const g = params.get('g')
      if (g === 'f') {
        setGuestGender('female')
      } else {
        setGuestGender('male')
      }
    } catch {
      // Malformed percent-encoding — keep default guest name.
    }
    lowPower = matchMedia('(max-width: 768px), (pointer: coarse)').matches

    // useGltf owns model fetching to avoid duplicate first-load transfers.
    void import('./lib/components/threed/World.svelte').then((module) => {
      World = module.default
    })
  })
</script>

<div class="invitation-app relative h-screen h-[100dvh] w-full overflow-hidden bg-[linear-gradient(180deg,#8ed3f7_0%,#eaf8ff_100%)]">
  {#if World}
    <World {lowPower} onReady={() => { sceneReady = true; completeProgress(); setLoaded(true); setHasStarted(true) }} />
  {/if}

  <!-- 2D Label Overlay -->
  <div class="pointer-events-none absolute inset-0 overflow-hidden">
    {#each $screenLabels as label (label.id)}
      <div
        class:objective-label={label.objective}
        class="world-label absolute -translate-x-1/2 -translate-y-full transition-opacity duration-200"
        style="left: {label.x}px; top: {label.y}px; opacity: {label.behind ? 0 : label.opacity}"
      >
        {#if label.objective}<span aria-hidden="true">&#9670;</span>{/if}
        {label.text}
      </div>
    {/each}
  </div>

  {#if $hasStarted}
    <WeddingHero />
    <InteractionHint />
    <MobileControls />
    <AudioPlayer {sceneReady} />
  {/if}

  <NpcDialog />
  <GuestbookModal />
  <WeddingStageModal />
  
  <LoadingScreen />
</div>

<style>
  .invitation-app {
    --hud-ivory: rgba(255, 250, 242, 0.8);
    --hud-ivory-strong: rgba(255, 250, 242, 0.92);
    --hud-edge: rgba(217, 183, 123, 0.62);
    --hud-edge-soft: rgba(255, 255, 255, 0.72);
    --hud-maroon: #713645;
    --hud-maroon-glass: rgba(91, 42, 54, 0.86);
    --hud-copy: #4a353b;
    --hud-muted: #806e72;
    --hud-gold: #c9a45e;
    --hud-shadow: 0 18px 44px -22px rgba(62, 34, 41, 0.62);
    user-select: none;
    -webkit-user-select: none;
    font-family: Outfit, 'Segoe UI', system-ui, sans-serif;
  }
</style>
