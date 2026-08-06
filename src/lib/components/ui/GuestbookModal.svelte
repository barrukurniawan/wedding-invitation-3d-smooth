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
    class="modal-backdrop absolute inset-0 z-50 flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    onclick={(e) => { if (e.target === e.currentTarget) closeModal() }}
    onkeydown={(e) => { if (e.code === 'Escape') closeModal() }}
    tabindex="-1"
  >
    <div class="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-[1.5rem] w-panel">
      <div class="flex items-center justify-between border-b border-[var(--champagne)]/20 px-5 py-4 sm:px-6">
        <div class="flex items-center space-x-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 text-[var(--deep-rose)] shadow-sm" aria-hidden="true">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7.5h16v11H4zM4 8l8 6 8-6M7 4.5h10" /></svg>
          </span>
          <div>
            <h3 class="text-lg font-bold text-[var(--deep-rose)]">Buku Tamu</h3>
            <p class="text-xs text-[var(--ink)]/50">{entries.length} ucapan masuk</p>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="rounded-lg px-3 py-1.5 text-xs font-medium w-tab {showForm ? 'w-tab-active' : ''}" onclick={() => (showForm = true)}>Tulis</button>
          <button class="rounded-lg px-3 py-1.5 text-xs font-medium w-tab {!showForm ? 'w-tab-active' : ''}" onclick={() => (showForm = false)}>Baca</button>
        </div>
      </div>

      {#if showForm}
        <form onsubmit={(e) => { e.preventDefault(); submitForm() }} class="flex flex-col space-y-4 p-6">
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
          <div class="flex space-x-3 pt-2">
            <button type="button" class="flex-1 rounded-xl py-2.5 text-sm font-medium w-btn-ghost" onclick={closeModal}>Batal</button>
            <button type="submit" disabled={submitting} class="flex-1 rounded-xl py-2.5 text-sm font-semibold w-btn-primary transition disabled:opacity-60">{submitting ? 'Mengirim...' : 'Kirim Ucapan'}</button>
          </div>
          {#if submitError}<p class="text-center text-xs text-red-400">{submitError}</p>{/if}
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
</style>
