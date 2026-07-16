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
  <div class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-stone-950 p-6 text-center">
    <div class="mx-auto flex h-20 w-20 items-center justify-center">
      <div class="absolute h-16 w-16 animate-spin rounded-full border-4 border-rose-500/20 border-t-rose-500"></div>
      <span class="animate-pulse text-3xl">💖</span>
    </div>
    <h2 class="mt-4 text-2xl font-bold text-rose-100">Dunia Undangan 3D</h2>
    <p class="mt-2 max-w-sm text-sm text-stone-400">
      Sedang memuat aset dunia interaktif pernikahan Dinda & Reza. Harap tunggu sebentar...
    </p>
    <div class="mt-2 h-1.5 w-full max-w-sm overflow-hidden rounded-full border border-stone-800 bg-stone-900">
      <div class="h-1.5 bg-rose-500 transition-all duration-300" style="width: {Math.round(progress)}%"></div>
    </div>
  </div>
{/if}
