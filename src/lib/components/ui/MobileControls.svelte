<script lang="ts">
  import { nearbyTrigger, activeModal, openModal } from '../../stores/gameState.svelte'
  import { joystickDelta } from '../../stores/playerMovement.svelte'

  let knobOffset = $state({ x: 0, y: 0 })
  let joystickCenter = { x: 0, y: 0 }
  const maxDistance = 40

  function handleTouchStart(e: TouchEvent) {
    e.preventDefault()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    joystickCenter.x = rect.left + rect.width / 2
    joystickCenter.y = rect.top + rect.height / 2
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

<div class="pointer-events-none absolute inset-x-0 bottom-16 z-30 flex items-end justify-between p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] select-none md:hidden">
  <div
    class="pointer-events-auto relative flex h-32 w-32 touch-none items-center justify-center rounded-full border border-[var(--champagne)]/40 bg-[var(--panel-bg)] backdrop-blur-md"
    role="application"
    aria-label="Joystick gerak"
    ontouchstart={handleTouchStart}
    ontouchmove={handleTouchMove}
    ontouchend={handleTouchEnd}
  >
    <div
      class="absolute h-12 w-12 rounded-full bg-gradient-to-tr from-[var(--rose)] to-[#e98a96] shadow-lg shadow-rose-900/40 transition-transform duration-75"
      style="transform: translate({knobOffset.x}px, {knobOffset.y}px)"
    ></div>
  </div>

  {#if $nearbyTrigger}
    <div class="pointer-events-auto">
      <button
        class="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-[var(--rose)] to-[#e98a96] text-lg font-bold text-white shadow-lg border border-[var(--champagne)]/40 transition-transform active:scale-95 hover:from-[#e98a96] hover:to-[var(--rose)]"
        onclick={interact}
      >
        E
      </button>
    </div>
  {/if}
</div>
