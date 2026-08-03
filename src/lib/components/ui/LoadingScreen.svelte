<script lang="ts">
  import { onMount } from 'svelte'
  import { isLoaded } from '../../stores/gameState.svelte'
  import { loadProgress } from '../../stores/loadProgress.svelte'
  import { weddingConfig } from '../../stores/weddingConfig.svelte'

  onMount(() => {
    document.getElementById('startup-shell')?.remove()
  })

  const pct = $derived(Math.round($loadProgress * 100))
</script>

{#if !$isLoaded}
  <div class="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 text-center" style="background: linear-gradient(160deg, #fff8ef 0%, #fbe6d8 55%, #f3cdbf 100%);">
    <div class="mx-auto flex h-20 w-20 items-center justify-center">
      <div class="absolute h-16 w-16 animate-spin rounded-full border-4 border-[var(--rose)]/20 border-t-[var(--rose)]"></div>
      <span class="animate-pulse text-3xl">💖</span>
    </div>
    <h2 class="mt-4 font-serif text-3xl font-bold tracking-wide text-[var(--deep-rose)]">Halo, Undangan yang Terhormat</h2>
    <p class="mt-3 max-w-sm text-sm text-[var(--ink)]/60">
      Sedang memuat undangan pernikahan {$weddingConfig.bride_name?.toUpperCase() || 'KIA'} &amp; {$weddingConfig.groom_name?.toUpperCase() || 'TONI'}<br />
      <span class="text-[var(--ink)]/40">Harap tunggu sebentar…</span>
    </p>
    <div
      class="loading-track mt-8 h-1.5 w-full max-w-sm overflow-hidden rounded-full border border-[var(--champagne)]/30 bg-white/50"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div
        class="loading-bar h-full rounded-full bg-gradient-to-r from-[var(--rose)] to-[var(--champagne)] transition-[width] duration-300 ease-out"
        style="width: {Math.max(8, pct)}%"
      ></div>
    </div>
  </div>
{/if}
