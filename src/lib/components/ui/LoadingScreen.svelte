<script lang="ts">
  import { isLoaded } from '../../stores/gameState.svelte'

  // Progress simulasi (useProgress dari @threlte/extras hanya bekerja di dalam <Canvas>)
  let progress = $state(0)
  $effect(() => {
    if ($isLoaded) return
    const interval = setInterval(() => {
      progress = Math.min(95, progress + Math.random() * 12)
    }, 200)
    return () => clearInterval(interval)
  })
</script>

{#if !$isLoaded}
  <div class="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 text-center" style="background: linear-gradient(160deg, #fff8ef 0%, #fbe6d8 55%, #f3cdbf 100%);">
    <div class="mx-auto flex h-20 w-20 items-center justify-center">
      <div class="absolute h-16 w-16 animate-spin rounded-full border-4 border-[var(--rose)]/20 border-t-[var(--rose)]"></div>
      <span class="animate-pulse text-3xl">💖</span>
    </div>
    <h2 class="mt-4 font-serif text-3xl font-bold tracking-wide text-[var(--deep-rose)]">Halo, Undangan yang Terhormat</h2>
    <p class="mt-3 max-w-sm text-sm text-[var(--ink)]/60">
      Sedang memuat undangan pernikahan KIA &amp; TONI<br />
      <span class="text-[var(--ink)]/40">Harap tunggu sebentar…</span>
    </p>
    <div class="mt-8 h-1.5 w-full max-w-sm overflow-hidden rounded-full border border-[var(--champagne)]/30 bg-white/50">
      <div class="h-1.5 rounded-full bg-gradient-to-r from-[var(--rose)] to-[var(--champagne)] transition-all duration-300" style="width: {Math.round(progress)}%"></div>
    </div>
  </div>
{/if}
