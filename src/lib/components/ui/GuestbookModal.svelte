<script lang="ts">
  import { activeModal, closeModal, setGuestName } from '../../stores/gameState.svelte'
  import { submitGuestbook, getGuestbookEntries, type GuestbookEntry } from '../../services/api'

  let form = $state<{ name: string; attendance: GuestbookEntry['attendance']; message: string }>({ name: '', attendance: 'Hadir', message: '' })
  let entries = $state<GuestbookEntry[]>([])
  let loading = $state(false)
  let submitting = $state(false)
  let submitError = $state('')
  let showForm = $state(true)

  async function loadEntries() {
    loading = true
    entries = await getGuestbookEntries()
    loading = false
  }

  $effect(() => {
    if ($activeModal === 'guestbook') {
      showForm = true
      loadEntries()
    }
  })

  async function submitForm() {
    submitting = true
    submitError = ''
    setGuestName(form.name)
    const saved = await submitGuestbook(form)
    submitting = false
    if (!saved) {
      submitError = 'Ucapan belum dapat dikirim. Coba lagi.'
      return
    }
    form = { name: '', attendance: 'Hadir', message: '' }
    showForm = false
    await loadEntries()
  }

  function timeAgo(ts: string): string {
    if (!ts) return ''
    const d = new Date(ts)
    if (Number.isNaN(d.getTime())) return ''
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diff < 60) return 'Baru saja'
    if (diff < 3600) return Math.floor(diff / 60) + ' menit lalu'
    if (diff < 86400) return Math.floor(diff / 3600) + ' jam lalu'
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }
</script>

{#if $activeModal === 'guestbook'}
  <div
    class="modal-backdrop w-modal-backdrop absolute inset-0 z-50 flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    onclick={(e) => { if (e.target === e.currentTarget) closeModal() }}
    onkeydown={(e) => { if (e.code === 'Escape') closeModal() }}
    tabindex="-1"
  >
    <div class="w-modal-panel guestbook-panel flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-[1.5rem] w-panel">
      <div class="guestbook-header flex items-center justify-between gap-4 border-b border-[var(--champagne)]/20 px-5 py-4 sm:px-6">
        <div class="guestbook-title-group flex min-w-0 flex-1 items-center gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70 text-[var(--deep-rose)] shadow-sm" aria-hidden="true">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7.5h16v11H4zM4 8l8 6 8-6M7 4.5h10" /></svg>
          </span>
          <div class="min-w-0 flex-1">
            <h3 class="text-lg font-bold text-[var(--deep-rose)]">Buku Tamu</h3>
            <p class="guestbook-count text-xs text-[var(--ink)]/50">{entries.length} ucapan masuk</p>
          </div>
        </div>
        <div class="guestbook-toggle-group flex shrink-0 items-center gap-2">
          <button class="guestbook-tab rounded-lg px-3 py-1.5 text-xs font-medium w-tab {showForm ? 'w-tab-active' : ''}" onclick={() => (showForm = true)}>Tulis</button>
          <button class="guestbook-tab rounded-lg px-3 py-1.5 text-xs font-medium w-tab {!showForm ? 'w-tab-active' : ''}" onclick={() => (showForm = false)}>Baca</button>
        </div>
      </div>

      {#if showForm}
        <form onsubmit={(e) => { e.preventDefault(); submitForm() }} class="guestbook-form flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-6">
          <div class="flex flex-col space-y-4">
          <div>
            <label for="gb-name" class="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--deep-rose)]/70">Nama Lengkap</label>
            <input id="gb-name" bind:value={form.name} type="text" required placeholder="Masukkan nama Anda" class="w-full rounded-xl px-4 py-2.5 text-sm w-input" />
          </div>
          <div>
            <label for="gb-attend" class="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--deep-rose)]/70">Kehadiran</label>
            <select id="gb-attend" bind:value={form.attendance} class="w-full rounded-xl px-4 py-2.5 text-sm w-input">
              <option value="Hadir">Hadir</option>
              <option value="Ragu-ragu">Ragu-ragu</option>
              <option value="Tidak Hadir">Tidak Hadir</option>
            </select>
          </div>
          <div>
            <label for="gb-msg" class="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--deep-rose)]/70">Ucapan & Doa</label>
            <textarea id="gb-msg" bind:value={form.message} rows="3" required placeholder="Tuliskan ucapan selamat menikah..." class="w-full resize-none rounded-xl px-4 py-2.5 text-sm w-input"></textarea>
          </div>
          {#if submitError}<p class="text-center text-xs text-red-500">{submitError}</p>{/if}
          </div>
          <div class="guestbook-actions -mx-5 mt-4 flex shrink-0 space-x-3 border-t border-[var(--champagne)]/20 bg-[var(--panel-bg)] px-5 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-4 sm:-mx-6 sm:px-6">
            <button type="button" class="flex-1 rounded-xl py-2.5 text-sm font-medium w-btn-ghost" onclick={closeModal}>Batal</button>
            <button type="submit" disabled={submitting} class="flex-1 rounded-xl py-2.5 text-sm font-semibold w-btn-primary transition disabled:opacity-60">{submitting ? 'Mengirim...' : 'Kirim Ucapan'}</button>
          </div>
        </form>
      {:else}
        <div class="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 max-h-96">
          {#if loading}
            <p class="py-8 text-center text-sm text-[var(--ink)]/50">Memuat ucapan...</p>
          {:else if entries.length === 0}
            <p class="py-8 text-center text-sm text-[var(--ink)]/50">Belum ada ucapan. Jadilah yang pertama.</p>
          {:else}
            {#each entries as entry}
              <div class="rounded-xl p-3 w-card">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-semibold text-[var(--deep-rose)]">{entry.name}</p>
                  <span class="text-xs text-[var(--ink)]/45">{timeAgo(entry.created_at)}</span>
                </div>
                <p class="mt-1 text-xs font-medium text-[var(--deep-rose)]/65">{entry.attendance}</p>
                <p class="mt-2 text-sm leading-relaxed text-[var(--ink)]/85">{entry.message}</p>
              </div>
            {/each}
          {/if}
        </div>
        <div class="border-t border-[var(--champagne)]/20 p-4">
          <button class="w-full rounded-xl py-2.5 text-sm font-semibold w-btn-primary" onclick={closeModal}>Tutup</button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    background: rgba(66, 43, 45, 0.28);
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
  }

  .guestbook-form {
    overscroll-behavior: contain;
    scrollbar-width: thin;
  }

  .guestbook-actions button {
    min-height: 2.75rem;
    flex-shrink: 0;
  }

  .guestbook-actions {
    position: sticky;
    bottom: 0;
    z-index: 1;
  }

  @media (max-height: 42rem) {
    .guestbook-header { padding-block: 0.75rem; }
    .guestbook-form { padding-top: 1rem; }
  }

  .guestbook-title-group h3,
  .guestbook-count {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .guestbook-title-group {
    min-width: 0;
    flex-basis: 0;
  }

  .guestbook-tab {
    min-width: 3.7rem;
    min-height: 2.5rem;
    white-space: nowrap;
  }

  @media (max-width: 23rem) {
    .guestbook-header {
      align-items: flex-start;
      gap: 0.85rem;
    }

    .guestbook-title-group {
      align-items: flex-start;
    }

    .guestbook-title-group h3 {
      font-size: 1rem;
      line-height: 1.15;
    }

    .guestbook-count {
      max-width: 6rem;
      line-height: 1.25;
    }

    .guestbook-toggle-group {
      gap: 0.35rem;
    }

    .guestbook-tab {
      min-width: 3.35rem;
      padding-inline: 0.55rem;
    }
  }
</style>
