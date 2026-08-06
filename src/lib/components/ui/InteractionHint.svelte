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
    class="mobile-hint pointer-events-none absolute left-1/2 z-40 -translate-x-1/2"
    role="status"
    aria-live="polite"
    transition:fade={{ duration: 180 }}
  >
    <div class="hint-card">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {#if showInteractionHint}
          <path d="M8.5 11.3V8.6a1.45 1.45 0 0 1 2.9 0v2.1-3.1a1.45 1.45 0 0 1 2.9 0v3.1-1.9a1.45 1.45 0 0 1 2.9 0v3.3-1.2a1.45 1.45 0 0 1 2.9 0v3.6c0 3.7-2.5 6-6.3 6h-1.2c-2.3 0-4.2-1.1-5.5-3l-2.6-3.8a1.5 1.5 0 0 1 2.4-1.8l1.6 1.4Z" />
        {:else}
          <path d="M12 3v3m-6.4-.4 2.1 2.1M3 12h3m.4 6.4 2.1-2.1M12 18v3m6.4-2.6-2.1-2.1M18 12h3m-2.6-6.4-2.1 2.1" />
          <circle cx="12" cy="12" r="3.2" />
        {/if}
      </svg>
      {#if showInteractionHint}
        <span class="touch-copy">Ketuk Buka untuk berinteraksi.</span>
        <span class="keyboard-copy">Tekan E untuk berinteraksi.</span>
      {:else}
        <span>Dekati resepsionis untuk membuka undangan.</span>
      {/if}
    </div>
  </div>
{/if}

{#if showInteractionHint}
  <div
    class="desktop-hint absolute bottom-28 left-1/2 z-40 hidden -translate-x-1/2 cursor-pointer select-none items-center gap-3 md:flex"
    role="button"
    tabindex="0"
    onclick={interact}
    onkeydown={(e) => e.code === 'Enter' && interact()}
  >
    <kbd>E</kbd>
    <span>Berinteraksi dengan {$nearbyTrigger?.label}</span>
  </div>
{/if}

<style>
  .mobile-hint {
    top: calc(env(safe-area-inset-top) + 7.25rem);
    width: min(calc(100% - 2rem), 22rem);
  }

  .touch-copy { display: none; }

  .hint-card {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.65rem;
    border: 1px solid rgba(217, 183, 123, 0.48);
    border-radius: 1.15rem;
    background: var(--hud-maroon-glass);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14), 0 16px 34px -22px rgba(47, 21, 28, 0.9);
    padding: 0.75rem 1rem;
    color: #fff8ef;
    font-size: 0.78rem;
    font-weight: 500;
    line-height: 1.35;
    text-align: left;
    -webkit-backdrop-filter: blur(14px) saturate(1.08);
    backdrop-filter: blur(14px) saturate(1.08);
  }

  .hint-card svg {
    width: 1.15rem;
    height: 1.15rem;
    flex: 0 0 auto;
    fill: none;
    stroke: #ecd39d;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.65;
  }

  .desktop-hint {
    border: 1px solid var(--hud-edge);
    border-radius: 999px;
    background: var(--hud-ivory);
    box-shadow: inset 0 1px 0 var(--hud-edge-soft), var(--hud-shadow);
    padding: 0.65rem 1.05rem 0.65rem 0.65rem;
    color: var(--hud-copy);
    font-size: 0.88rem;
    font-weight: 500;
    -webkit-backdrop-filter: blur(16px);
    backdrop-filter: blur(16px);
    transition: transform 180ms ease, background 180ms ease;
  }

  .desktop-hint:hover { background: var(--hud-ivory-strong); }
  .desktop-hint:active { transform: translateX(-50%) scale(0.98); }
  .desktop-hint:focus-visible { outline: 2px solid var(--hud-gold); outline-offset: 3px; }

  .desktop-hint kbd {
    display: grid;
    width: 1.9rem;
    height: 1.9rem;
    place-items: center;
    border: 1px solid rgba(113, 54, 69, 0.22);
    border-radius: 0.55rem;
    background: var(--hud-maroon);
    box-shadow: 0 2px 0 rgba(63, 30, 39, 0.28);
    color: #fff8ef;
    font: 700 0.76rem/1 Outfit, sans-serif;
  }

  @media (pointer: coarse) {
    .touch-copy { display: inline; }
    .keyboard-copy { display: none; }
    .desktop-hint { display: none !important; }
  }

  @media (min-width: 768px) and (pointer: fine) {
    .mobile-hint { display: none; }
  }

  @media (pointer: coarse) and (orientation: landscape) and (max-height: 520px) {
    .mobile-hint {
      top: calc(env(safe-area-inset-top) + 4.8rem);
      width: min(calc(100% - 10rem), 20rem);
    }

    .hint-card {
      border-radius: 0.9rem;
      padding: 0.5rem 0.8rem;
      font-size: 0.7rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .desktop-hint { transition: none; }
  }
</style>
