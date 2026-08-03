<script lang="ts">
  import { activeModal, activeNpcData, closeModal } from '../../stores/gameState.svelte'
  import { weddingConfig } from '../../stores/weddingConfig.svelte'

  let currentMessageIndex = $state(0)

  $effect(() => {
    if ($activeModal === 'npc') currentMessageIndex = 0
  })

  function nextMessage() {
    if ($activeNpcData && currentMessageIndex < $activeNpcData.messages.length - 1) {
      currentMessageIndex++
    }
  }

  function parseText(text: string | undefined) {
    if (!text) return ''
    const bride = $weddingConfig.bride_name || 'Kia'
    const groom = $weddingConfig.groom_name || 'Toni'
    return text.replace(/{bride}/g, bride).replace(/{groom}/g, groom)
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
    <div class="flex w-full max-w-md flex-col space-y-6 rounded-2xl p-6 w-panel">
      <div class="flex items-center space-x-4">
        <div class="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--champagne)]/40 bg-[var(--rose)]/15 text-3xl">
          {$activeNpcData.avatar}
        </div>
        <div>
          <h3 class="text-xl font-bold text-[var(--rose)]">{$activeNpcData.name}</h3>
          <p class="text-xs uppercase tracking-[0.18em] text-[var(--champagne)]/80">Resepsionis</p>
        </div>
      </div>

      <div class="min-h-[80px] rounded-xl p-4 w-card">
        <p class="text-sm leading-relaxed text-[var(--ivory)]/90 md:text-base">
          {parseText($activeNpcData.messages[currentMessageIndex])}
        </p>
        {#if $activeNpcData.mapsUrl}
          <a
            href={$activeNpcData.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="mt-3 flex items-center gap-2 rounded-lg border border-[var(--rose)]/40 bg-[var(--rose)]/10 px-3 py-2 text-xs font-semibold text-[var(--ivory)]/90 transition hover:bg-[var(--rose)]/20 hover:border-[var(--rose)]/70"
          >
            <span class="text-base">📍</span>
            <span class="flex-1">{parseText($activeNpcData.venueAddress)}</span>
            <span class="ml-auto shrink-0 rounded-md bg-[var(--rose)]/70 px-2 py-0.5 text-white">Buka Maps →</span>
          </a>
        {/if}
      </div>

      <div class="flex items-center justify-between">
        <span class="text-xs font-medium text-[var(--ivory)]/45">
          Halaman {currentMessageIndex + 1} dari {$activeNpcData.messages.length}
        </span>
        <div class="flex space-x-3">
          {#if currentMessageIndex < $activeNpcData.messages.length - 1}
            <button class="rounded-xl px-4 py-2 text-sm font-medium w-btn-ghost" onclick={nextMessage}>
              Lanjut
            </button>
          {:else}
            <button
              class="rounded-xl px-5 py-2 text-sm font-semibold w-btn-primary"
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
