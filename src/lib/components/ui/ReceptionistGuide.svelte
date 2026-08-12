<script lang="ts">
  import { nearbyTrigger, activeModal, hasStarted } from '../../stores/gameState.svelte'
  import { playerPos } from '../../stores/playerMovement.svelte'
  import { receptionistScreenPos } from '../../stores/receptionistGuide.svelte'
  import { fade } from 'svelte/transition'

  // Sembunyikan setelah berhasil buka dialog resepsionis
  let hasInteracted = $state(false)

  $effect(() => {
    if ($nearbyTrigger?.id === 'receptionist' && $activeModal) {
      hasInteracted = true
    }
  })

  const dist = $derived(Math.hypot(4.9 - playerPos.x, -10 - playerPos.z))
  const showGuide = $derived($hasStarted && !hasInteracted && !$activeModal && dist > 5)
  const pos = $derived($receptionistScreenPos)

  // Hitung sudut panah dari tengah layar
  let screenW = $state(window.innerWidth)
  let screenH = $state(window.innerHeight)

  function onResize() {
    screenW = window.innerWidth
    screenH = window.innerHeight
  }

  import { onMount } from 'svelte'
  onMount(() => {
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  })

  const arrowAngle = $derived(() => {
    if (!pos) return 0
    const cx = screenW / 2
    const cy = screenH / 2
    return Math.atan2(pos.y - cy, pos.x - cx) * (180 / Math.PI) + 90
  })
</script>

{#if showGuide && pos}
  <!-- Glow beacon di posisi resepsionis -->
  {#if pos.visible}
    <div
      class="receptionist-beacon pointer-events-none absolute"
      style="left: {pos.x}px; top: {pos.y - 60}px;"
      transition:fade={{ duration: 300 }}
    >
      <div class="glow-ring ring-1"></div>
      <div class="glow-ring ring-2"></div>
      <div class="glow-ring ring-3"></div>
      <div class="beacon-dot"></div>
      <div class="beacon-label">Resepsionis</div>
    </div>
  {/if}

  <!-- Panah pengarah jika resepsionis di luar layar -->
  {#if !pos.visible}
    <div
      class="direction-arrow pointer-events-none absolute"
      style="
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%) rotate({arrowAngle()}deg) translateY(-38vmin);
      "
      transition:fade={{ duration: 300 }}
    >
      <svg viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 4L32 36H4L18 4Z" fill="#c9a45e" stroke="white" stroke-width="2.5" stroke-linejoin="round"/>
      </svg>
      <span>Resepsionis</span>
    </div>
  {/if}
{/if}

<style>
  .receptionist-beacon {
    transform: translate(-50%, -50%);
  }

  .glow-ring {
    position: absolute;
    border-radius: 50%;
    border: 2.5px solid rgba(201, 164, 94, 0.75);
    transform: translate(-50%, -50%);
    left: 50%;
    top: 50%;
    animation: beacon-pulse 2.2s infinite ease-out;
  }

  .ring-1 { width: 36px;  height: 36px;  animation-delay: 0s;    }
  .ring-2 { width: 65px;  height: 65px;  animation-delay: 0.6s;  }
  .ring-3 { width: 95px;  height: 95px;  animation-delay: 1.2s;  }

  @keyframes beacon-pulse {
    0%   { opacity: 0.85; transform: translate(-50%, -50%) scale(0.4); }
    100% { opacity: 0;    transform: translate(-50%, -50%) scale(1);   }
  }

  .beacon-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #c9a45e;
    box-shadow: 0 0 14px 5px rgba(201, 164, 94, 0.75);
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }

  .beacon-label {
    position: absolute;
    top: calc(50% + 22px);
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
    font: 700 0.72rem/1 Outfit, sans-serif;
    color: #fff8ef;
    background: rgba(91, 42, 54, 0.88);
    border: 1px solid rgba(201, 164, 94, 0.5);
    padding: 0.22rem 0.6rem;
    border-radius: 0.55rem;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    letter-spacing: 0.05em;
  }

  .direction-arrow {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    animation: arrow-bob 1.4s ease-in-out infinite;
  }

  .direction-arrow svg {
    width: 28px;
    height: 36px;
    filter: drop-shadow(0 0 8px rgba(201, 164, 94, 0.8));
  }

  .direction-arrow span {
    font: 700 0.66rem/1 Outfit, sans-serif;
    color: #fff8ef;
    background: rgba(91, 42, 54, 0.88);
    border: 1px solid rgba(201, 164, 94, 0.5);
    padding: 0.18rem 0.5rem;
    border-radius: 0.5rem;
    white-space: nowrap;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    letter-spacing: 0.05em;
  }

  @keyframes arrow-bob {
    0%, 100% { margin-top: 0px; }
    50%       { margin-top: -7px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .glow-ring, .direction-arrow { animation: none; }
  }
</style>
