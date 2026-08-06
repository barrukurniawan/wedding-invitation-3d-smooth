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
    class="modal-backdrop absolute inset-0 z-50 flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    onclick={(e) => { if (e.target === e.currentTarget) closeModal() }}
    onkeydown={(e) => { if (e.code === 'Escape') closeModal() }}
    tabindex="-1"
  >
    <div class="flex w-full max-w-md flex-col space-y-5 rounded-[1.5rem] p-5 w-panel sm:p-6">
      <div class="flex items-center space-x-4">
        <div class="flex h-16 w-16 items-center justify-center rounded-[1.15rem] border border-[var(--champagne)]/40 bg-white/60 text-3xl shadow-sm">
          {$activeNpcData.avatar}
        </div>
        <div>
          <h3 class="text-xl font-bold text-[var(--deep-rose)]">{$activeNpcData.name}</h3>
          <p class="text-xs uppercase tracking-[0.18em] text-[var(--deep-rose)]/60">Resepsionis</p>
        </div>
      </div>

      <div class="min-h-[80px] rounded-[1.15rem] p-4 w-card">
        <p class="text-sm leading-relaxed text-[var(--ink)] md:text-base">
          {parseText($activeNpcData.messages[currentMessageIndex])}
        </p>
        {#if currentMessageIndex === 0 && ($activeNpcData.venueAddress || $activeNpcData.mapsUrl)}
          <a
            href={$activeNpcData.mapsUrl}
            class:opacity-60={!$activeNpcData.mapsUrl}
            aria-disabled={!$activeNpcData.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="mt-4 flex items-center gap-3 rounded-xl border border-[var(--champagne)]/30 bg-white/65 px-3 py-3 text-xs text-[var(--ink)] transition hover:border-[var(--champagne)]/70 hover:bg-white"
          >
            <svg class="h-5 w-5 shrink-0 text-[var(--deep-rose)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" />
              <circle cx="12" cy="10" r="2.2" />
            </svg>
            <span class="min-w-0 flex-1">
              <span class="block text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--deep-rose)]/60">Alamat venue</span>
              <span class="mt-0.5 block leading-relaxed">{parseText($activeNpcData.venueAddress) || 'Alamat belum tersedia.'}</span>
            </span>
            {#if $activeNpcData.mapsUrl}<span class="ml-auto shrink-0 rounded-lg bg-[var(--deep-rose)] px-2.5 py-1.5 font-semibold text-white">Buka Maps</span>{/if}
          </a>
        {/if}
      </div>

      <div class="flex items-center justify-between">
        <span class="text-xs font-medium text-[var(--ink)]/50">
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

<style>
  .modal-backdrop {
    background: rgba(66, 43, 45, 0.28);
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
  }
</style>
