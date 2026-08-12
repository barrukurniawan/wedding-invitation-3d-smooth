<script lang="ts">
  import { nearbyTrigger, activeModal, hasStarted } from '../../stores/gameState.svelte'
  import { fade } from 'svelte/transition'
  import { onMount } from 'svelte'

  // Sembunyikan setelah berhasil buka dialog resepsionis.
  // State ini hanya berubah 1x → aman dipakai Svelte reactivity.
  let hasInteracted = $state(false)
  let mounted = $state(false)

  $effect(() => {
    if ($nearbyTrigger?.id === 'receptionist' && $activeModal) {
      hasInteracted = true
    }
  })

  // showGuide hanya dievaluasi saat $hasStarted / $activeModal / hasInteracted berubah
  // (bukan per frame). Jarak ke resepsionis dicek di loop JS di bawah.
  const showGuide = $derived($hasStarted && !hasInteracted && !$activeModal)

  // Interval 200ms (5fps) untuk cek jarak — cukup untuk show/hide logic
  let isNear = $state(false)
  let checkInterval: ReturnType<typeof setInterval>

  onMount(() => {
    mounted = true
    // Import playerPos tanpa reaktivitas Svelte (plain object)
    import('../../stores/playerMovement.svelte').then(({ playerPos }) => {
      checkInterval = setInterval(() => {
        const dist = Math.hypot(4.9 - playerPos.x, -10 - playerPos.z)
        isNear = dist <= 5
      }, 200)
    })
    return () => clearInterval(checkInterval)
  })

  // Komponen tampil saat: mulai, belum interact, belum dekat, tidak ada modal
  const visible = $derived(showGuide && mounted && !isNear)
</script>

{#if visible}
  <!--
    Beacon: posisinya diupdate langsung oleh Labels.svelte useTask via DOM.
    Svelte hanya bertanggung jawab untuk mount/unmount (jarang terjadi).
  -->
  <div
    id="receptionist-guide-beacon"
    class="receptionist-beacon pointer-events-none absolute"
    transition:fade={{ duration: 300 }}
  >
    <div class="glow-ring ring-1"></div>
    <div class="glow-ring ring-2"></div>
    <div class="glow-ring ring-3"></div>
    <div class="beacon-dot"></div>
    <div class="beacon-label">Resepsionis</div>
  </div>

  <!--
    Arrow: hanya muncul jika resepsionis off-screen.
    Rotasinya diupdate langsung oleh Labels.svelte via DOM.
  -->
  <div
    id="receptionist-guide-arrow"
    class="direction-arrow pointer-events-none absolute"
    style="display: none; left: 50%; top: 50%;"
    transition:fade={{ duration: 300 }}
  >
    <svg viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 4L32 36H4L18 4Z" fill="#c9a45e" stroke="white" stroke-width="2.5" stroke-linejoin="round"/>
    </svg>
    <span>Resepsionis</span>
  </div>
{/if}

<style>
  .receptionist-beacon {
    /* transform di-set per frame oleh Labels.svelte secara langsung */
    transform: translate(-50%, -50%);
    will-change: transform;
  }

  .glow-ring {
    position: absolute;
    border-radius: 50%;
    border: 2.5px solid rgba(201, 164, 94, 0.75);
    transform: translate(-50%, -50%);
    left: 50%;
    top: 50%;
    animation: beacon-pulse 2.2s infinite ease-out;
    will-change: opacity, transform;
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
    will-change: transform;
    transform-origin: 50% 50%;
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
