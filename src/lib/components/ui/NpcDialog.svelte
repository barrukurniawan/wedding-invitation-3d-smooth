<script lang="ts">
  import { activeModal, activeNpcData, closeModal } from '../../stores/gameState.svelte'

  let currentMessageIndex = $state(0)

  $effect(() => {
    if ($activeModal === 'npc') currentMessageIndex = 0
  })

  function nextMessage() {
    if ($activeNpcData && currentMessageIndex < $activeNpcData.messages.length - 1) {
      currentMessageIndex++
    }
  }
</script>

{#if $activeModal === 'npc' && $activeNpcData}
  <div
    class="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    onclick={(e) => { if (e.target === e.currentTarget) closeModal() }}
    onkeydown={(e) => { if (e.code === 'Escape') closeModal() }}
    tabindex="-1"
  >
    <div class="flex w-full max-w-md flex-col space-y-6 rounded-2xl border border-stone-800 bg-stone-900 p-6 text-stone-100 shadow-2xl">
      <div class="flex items-center space-x-4">
        <div class="flex h-16 w-16 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/20 text-3xl">
          {$activeNpcData.avatar}
        </div>
        <div>
          <h3 class="text-xl font-bold text-rose-400">{$activeNpcData.name}</h3>
          <p class="text-xs text-stone-400">Pemandu / Receptionist</p>
        </div>
      </div>

      <div class="min-h-[80px] rounded-xl border border-stone-800/60 bg-stone-950/50 p-4">
        <p class="text-sm leading-relaxed text-stone-200 md:text-base">
          {$activeNpcData.messages[currentMessageIndex]}
        </p>
        {#if $activeNpcData.mapsUrl}
          <a
            href={$activeNpcData.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="mt-3 flex items-center gap-2 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/25 hover:border-rose-400/70"
          >
            <span class="text-base">📍</span>
            <span class="flex-1">{$activeNpcData.venueAddress}</span>
            <span class="ml-auto shrink-0 rounded-md bg-rose-600/60 px-2 py-0.5 text-white">Buka Maps →</span>
          </a>
        {/if}
      </div>

      <div class="flex items-center justify-between">
        <span class="text-xs font-medium text-stone-500">
          Halaman {currentMessageIndex + 1} dari {$activeNpcData.messages.length}
        </span>
        <div class="flex space-x-3">
          {#if currentMessageIndex < $activeNpcData.messages.length - 1}
            <button class="rounded-xl bg-stone-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700" onclick={nextMessage}>
              Lanjut
            </button>
          {:else}
            <button
              class="rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-900/40 transition hover:from-rose-500 hover:to-rose-400"
              onclick={closeModal}
            >
              Selesai
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
