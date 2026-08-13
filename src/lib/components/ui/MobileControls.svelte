<script lang="ts">
  import { nearbyTrigger, activeModal, openModal } from '../../stores/gameState.svelte'
  import { joystickDelta, playerMoving, tutorialJoystickDone } from '../../stores/playerMovement.svelte'
  import { scale, fade } from 'svelte/transition'
  import { backOut } from 'svelte/easing'

  let knobOffset = $state({ x: 0, y: 0 })
  let joystickCenter = { x: 0, y: 0 }
  let maxDistance = 32

  function handleTouchStart(e: TouchEvent) {
    e.preventDefault()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    joystickCenter.x = rect.left + rect.width / 2
    joystickCenter.y = rect.top + rect.height / 2
    maxDistance = rect.width * 0.3
  }

  function handleTouchMove(e: TouchEvent) {
    e.preventDefault()
    const touch = e.touches[0]
    let dx = touch.clientX - joystickCenter.x
    let dy = touch.clientY - joystickCenter.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    if (distance > maxDistance) {
      dx = (dx / distance) * maxDistance
      dy = (dy / distance) * maxDistance
    }
    knobOffset.x = dx
    knobOffset.y = dy
    joystickDelta.x = dx / maxDistance
    joystickDelta.z = dy / maxDistance
  }

  function handleTouchEnd(e: TouchEvent) {
    e.preventDefault()
    knobOffset.x = 0
    knobOffset.y = 0
    joystickDelta.x = 0
    joystickDelta.z = 0
  }

  function interact() {
    if ($nearbyTrigger) openModal($nearbyTrigger.action, $nearbyTrigger.npcData)
  }
</script>

<div class="mobile-controls pointer-events-none absolute inset-x-0 z-30 flex items-end justify-between select-none">
  <div
    class="joystick pointer-events-auto relative flex touch-none items-center justify-center rounded-full"
    role="application"
    aria-label="Joystick gerak"
    ontouchstart={handleTouchStart}
    ontouchmove={handleTouchMove}
    ontouchend={handleTouchEnd}
    ontouchcancel={handleTouchEnd}
  >
    {#if !$playerMoving}
      <span class="movement-cue" aria-hidden="true">Geser untuk bergerak</span>
    {/if}
    {#if !$tutorialJoystickDone}
      <div class="hand-tutorial pointer-events-none" aria-hidden="true" transition:fade={{ duration: 400 }}>
        👆
      </div>
    {/if}
    <span class="joystick-axis axis-x" aria-hidden="true"></span>
    <span class="joystick-axis axis-y" aria-hidden="true"></span>
    <span class="joystick-ring" aria-hidden="true"></span>
    <div
      class="joystick-knob absolute rounded-full transition-transform duration-75"
      style="transform: translate({knobOffset.x}px, {knobOffset.y}px)"
    ><span aria-hidden="true"></span></div>
  </div>

  {#if $nearbyTrigger && !$activeModal}
    <div class="action-slot pointer-events-auto" transition:scale={{ duration: 400, easing: backOut, start: 0.5 }}>
      <button
        class="open-action flex items-center justify-center"
        onclick={interact}
        aria-label={`Buka ${$nearbyTrigger.label}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8.5 11.3V8.6a1.45 1.45 0 0 1 2.9 0v2.1-3.1a1.45 1.45 0 0 1 2.9 0v3.1-1.9a1.45 1.45 0 0 1 2.9 0v3.3-1.2a1.45 1.45 0 0 1 2.9 0v3.6c0 3.7-2.5 6-6.3 6h-1.2c-2.3 0-4.2-1.1-5.5-3l-2.6-3.8a1.5 1.5 0 0 1 2.4-1.8l1.6 1.4Z" />
        </svg>
        <span>Buka</span>
      </button>
    </div>
  {/if}
</div>

<style>
  .mobile-controls {
    position: fixed;
    left: 0;
    right: 0;
    width: 100%;
    box-sizing: border-box;
    bottom: 0;
    min-width: 0;
    overflow: visible;
    padding:
      1rem
      max(1rem, env(safe-area-inset-right))
      max(1rem, env(safe-area-inset-bottom))
      max(1rem, env(safe-area-inset-left));
  }

  .joystick,
  .action-slot {
    flex: 0 0 auto;
  }

  .joystick {
    width: 6.75rem;
    height: 6.75rem;
    border: 1px solid var(--hud-edge);
    background: rgba(255, 250, 242, 0.42);
    box-shadow: inset 0 1px 0 var(--hud-edge-soft), 0 14px 34px -24px rgba(55, 30, 37, 0.75);
    -webkit-backdrop-filter: blur(14px) saturate(0.85);
    backdrop-filter: blur(14px) saturate(0.85);
  }

  .movement-cue {
    position: absolute;
    bottom: calc(100% + 0.55rem);
    left: 50%;
    padding: 0.35rem 0.6rem;
    border: 1px solid rgba(217, 183, 123, 0.45);
    border-radius: 0.7rem;
    background: rgba(255, 250, 242, 0.86);
    color: var(--hud-maroon);
    font: 600 0.62rem/1 Outfit, sans-serif;
    white-space: nowrap;
    transform: translateX(-50%);
    box-shadow: 0 8px 18px -12px rgba(55, 30, 37, 0.7);
  }

  .joystick-ring {
    position: absolute;
    inset: 0.72rem;
    border: 1px solid rgba(113, 54, 69, 0.12);
    border-radius: 50%;
  }

  .hand-tutorial {
    position: absolute;
    top: 50%;
    left: 50%;
    font-size: 2.2rem;
    line-height: 1;
    z-index: 10;
    transform-origin: center center;
    animation: hand-drag 1.8s ease-in-out infinite;
    filter: drop-shadow(0 4px 12px rgba(62, 34, 41, 0.4));
  }

  @keyframes hand-drag {
    0% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
    15% { transform: translate(-50%, -50%) scale(0.9); opacity: 1; }
    70% { transform: translate(-50%, -140%) scale(0.9); opacity: 1; }
    100% { transform: translate(-50%, -140%) scale(1); opacity: 0; }
  }

  .joystick-axis {
    position: absolute;
    background: rgba(113, 54, 69, 0.1);
  }

  .axis-x { width: 58%; height: 1px; }
  .axis-y { width: 1px; height: 58%; }

  .joystick-knob {
    display: grid;
    width: 2.65rem;
    height: 2.65rem;
    place-items: center;
    border: 1px solid rgba(201, 164, 94, 0.72);
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(244, 230, 213, 0.9));
    box-shadow: inset 0 1px 0 #fff, 0 7px 16px -8px rgba(76, 37, 48, 0.68);
  }

  .joystick-knob span {
    width: 0.46rem;
    height: 0.46rem;
    border-radius: 50%;
    background: var(--hud-maroon);
    box-shadow: 0 0 0 3px rgba(113, 54, 69, 0.09);
  }

  .open-action {
    min-width: 4.7rem;
    min-height: 3.4rem;
    flex-direction: column;
    gap: 0.15rem;
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 1.2rem;
    background: var(--hud-gold); /* Lebih mencolok dari ivory */
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), var(--hud-shadow);
    padding: 0.48rem 0.75rem 0.42rem;
    color: #fff;
    font: 650 0.68rem/1 Outfit, sans-serif;
    letter-spacing: 0.04em;
    transition: transform 160ms ease, background 160ms ease;
    -webkit-backdrop-filter: blur(16px);
    backdrop-filter: blur(16px);
    animation: cta-pulse 1.8s infinite cubic-bezier(0.66, 0, 0, 1);
  }

  @keyframes cta-pulse {
    0% { box-shadow: 0 0 0 0 rgba(201, 164, 94, 0.7), inset 0 1px 0 rgba(255,255,255,0.4); }
    70% { box-shadow: 0 0 0 15px rgba(201, 164, 94, 0), inset 0 1px 0 rgba(255,255,255,0.4); }
    100% { box-shadow: 0 0 0 0 rgba(201, 164, 94, 0), inset 0 1px 0 rgba(255,255,255,0.4); }
  }

  .open-action svg {
    width: 1.35rem;
    height: 1.35rem;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.75;
  }

  .open-action:active { transform: scale(0.96); }
  .open-action:focus-visible { outline: 2px solid var(--hud-gold); outline-offset: 3px; }

  /* Keep controls available in narrow/mobile emulation even when the browser
     reports a fine pointer. Only wide desktop layouts hide them. */
  @media (min-width: 768px) and (pointer: fine) {
    .mobile-controls { display: none; }
  }

  @media (pointer: coarse) and (orientation: landscape) and (max-height: 520px) {
    .mobile-controls {
      width: 100%;
      padding:
        0.6rem
        max(0.85rem, env(safe-area-inset-right))
        max(0.6rem, env(safe-area-inset-bottom))
        max(0.85rem, env(safe-area-inset-left));
    }

    .joystick { width: 5.65rem; height: 5.65rem; }
    .joystick-ring { inset: 0.62rem; }
    .joystick-knob { width: 2.25rem; height: 2.25rem; }
    .open-action { min-width: 4.25rem; min-height: 3rem; border-radius: 1rem; }
    .open-action svg { width: 1.15rem; height: 1.15rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .joystick-knob,
    .open-action { transition: none; }
  }
</style>
