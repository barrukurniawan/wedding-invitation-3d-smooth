<script lang="ts">
  import { onMount } from 'svelte'
  import { guestName } from '../../stores/gameState.svelte'
  import { configLoaded, weddingConfig } from '../../stores/weddingConfig.svelte'
  import { playerPos } from '../../stores/playerMovement.svelte'

  let visible = $state(true)

  const guestFirstName = $derived(firstName($guestName, 'Tamu'))
  const brideFirstName = $derived(firstName($weddingConfig.bride_name, 'Mempelai'))
  const groomFirstName = $derived(firstName($weddingConfig.groom_name, 'Mempelai'))
  const coupleTitle = $derived(`${brideFirstName} & ${groomFirstName}'s Wedding`)
  const receptionDate = $derived(
    $weddingConfig.resepsi_date?.trim() || 'Tanggal resepsi segera diumumkan'
  )

  function firstName(name: string | null | undefined, fallback: string) {
    return name?.trim().split(/\s+/)[0] || fallback
  }

  onMount(() => {
    let animId: number
    const checkPosition = () => {
      // Resepsionis berada di Z = -10, panggung di Z = -18.
      // Sembunyikan banner melayang setelah melewati area tengah / dekat resepsionis
      const shouldShow = playerPos.z > -8
      if (visible !== shouldShow) {
        visible = shouldShow
      }
      animId = requestAnimationFrame(checkPosition)
    }
    animId = requestAnimationFrame(checkPosition)
    return () => cancelAnimationFrame(animId)
  })
</script>

{#if $configLoaded}
  <section
    class="pointer-events-none absolute left-1/2 top-[calc(env(safe-area-inset-top)+0.75rem)] z-30 w-[min(calc(100%-8rem),22rem)] -translate-x-1/2 text-center transition-all duration-500 ease-out sm:w-[min(calc(100%-9rem),30rem)] md:top-[calc(env(safe-area-inset-top)+1rem)] md:w-[min(calc(100%-10rem),36rem)]"
    class:opacity-0={!visible}
    class:-translate-y-6={!visible}
    aria-label={`Hai ${guestFirstName}. ${receptionDate}. ${coupleTitle}`}
    aria-live="polite"
  >
    <div class="hero-panel rounded-2xl border border-white/45 bg-[rgba(142,211,247,0.22)] px-3.5 py-2.5 shadow-[0_12px_36px_-16px_rgba(51,38,43,0.42)] backdrop-blur-md md:rounded-3xl md:px-7 md:py-4">
      <p class="truncate text-xs font-semibold uppercase tracking-[0.16em] text-[var(--deep-rose)]/90 sm:text-sm">
        Hai {guestFirstName}
      </p>
      <p class="mt-1 text-sm font-bold leading-tight text-[var(--ink)] sm:text-base md:mt-1.5 md:text-lg">
        {receptionDate}
      </p>
      <div class="mx-auto my-1.5 h-px w-12 bg-gradient-to-r from-transparent via-[var(--champagne)] to-transparent md:my-2 md:w-16"></div>
      <h1 class="line-clamp-2 break-words font-serif text-base font-bold leading-tight text-[var(--deep-rose)] sm:text-xl md:text-2xl">
        {coupleTitle}
      </h1>
    </div>
  </section>
{/if}

<style>
  .hero-panel {
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
  }

  @media (prefers-reduced-motion: reduce) {
    .hero-panel {
      transition: none;
    }
  }
</style>
