<script lang="ts">
  import { nearbyTrigger, activeModal, openModal } from '../../stores/gameState.svelte'
  import { browser } from '$app/environment'

  function interact() {
    if ($nearbyTrigger) {
      openModal($nearbyTrigger.action, $nearbyTrigger.npcData)
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.code === 'KeyE') interact()
  }

  if (browser) {
    window.addEventListener('keydown', onKeyDown)
  }
</script>

{#if $nearbyTrigger && !$activeModal}
  <div
    class="absolute bottom-32 left-1/2 z-40 flex -translate-x-1/2 animate-bounce cursor-pointer select-none items-center space-x-3 rounded-full border border-rose-400 bg-rose-600/90 px-6 py-3 text-white shadow-lg backdrop-blur-md"
    role="button"
    tabindex="0"
    onclick={interact}
    onkeydown={(e) => e.code === 'Enter' && interact()}
  >
    <span class="rounded bg-white px-2 py-0.5 text-sm font-bold text-rose-600 shadow">E</span>
    <span class="text-sm font-medium md:text-base">Dekati {$nearbyTrigger.label} - Tekan untuk Interaksi</span>
  </div>
{/if}
