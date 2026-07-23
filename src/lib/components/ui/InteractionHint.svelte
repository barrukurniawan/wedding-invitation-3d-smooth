<script lang="ts">
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import { nearbyTrigger, activeModal, openModal } from '../../stores/gameState.svelte'
  import { playerMoving } from '../../stores/playerMovement.svelte'

  let hasMoved = $state(false)
  let interactedTriggerIds = $state<string[]>([])

  const currentTriggerCompleted = $derived(
    $nearbyTrigger ? interactedTriggerIds.includes($nearbyTrigger.id) : false
  )
  const showApproachHint = $derived(!hasMoved && !$playerMoving && !$nearbyTrigger && !$activeModal)
  const showInteractionHint = $derived(
    Boolean($nearbyTrigger && !$playerMoving && !$activeModal && !currentTriggerCompleted)
  )

  $effect(() => {
    if ($playerMoving) hasMoved = true
  })

  $effect(() => {
    if ($activeModal && $nearbyTrigger && !interactedTriggerIds.includes($nearbyTrigger.id)) {
      interactedTriggerIds = [...interactedTriggerIds, $nearbyTrigger.id]
    }
  })

  function interact() {
    if ($nearbyTrigger && !$activeModal) {
      openModal($nearbyTrigger.action, $nearbyTrigger.npcData)
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.code === 'KeyE') interact()
  }

  onMount(() => {
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })
</script>

<!-- Mobile guidance stays above the scene and clear of both thumb controls. -->
{#if showApproachHint || showInteractionHint}
  <div
    class="pointer-events-none absolute left-1/2 top-[calc(env(safe-area-inset-top)+0.75rem)] z-40 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 md:hidden"
    role="status"
    aria-live="polite"
    transition:fade={{ duration: 180 }}
  >
    <div class="rounded-xl border border-[var(--champagne)]/35 bg-[rgba(35,24,28,0.76)] px-4 py-2.5 text-center text-sm font-medium leading-snug text-[var(--ivory)] shadow-lg backdrop-blur-md">
      {showInteractionHint
        ? 'Tekan E untuk berinteraksi.'
        : 'Dekati resepsionis untuk membuka undangan.'}
    </div>
  </div>
{/if}

{#if showInteractionHint}
  <div
    class="absolute bottom-28 left-1/2 z-40 hidden -translate-x-1/2 cursor-pointer select-none items-center space-x-3 rounded-full border border-[var(--champagne)]/50 bg-[var(--panel-bg)] px-6 py-3 text-[var(--ivory)] shadow-lg backdrop-blur-md md:flex"
    role="button"
    tabindex="0"
    onclick={interact}
    onkeydown={(e) => e.code === 'Enter' && interact()}
  >
    <span class="rounded bg-[var(--ivory)] px-2 py-0.5 text-sm font-bold text-[var(--deep-rose)] shadow">E</span>
    <span class="text-sm font-medium md:text-base">Tekan E untuk berinteraksi dengan {$nearbyTrigger?.label}</span>
  </div>
{/if}
