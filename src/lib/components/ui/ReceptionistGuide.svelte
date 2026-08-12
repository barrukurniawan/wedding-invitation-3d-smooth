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
