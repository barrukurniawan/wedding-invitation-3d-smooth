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
    class="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    onclick={(e) => { if (e.target === e.currentTarget) closeModal() }}
    onkeydown={(e) => { if (e.code === 'Escape') closeModal() }}
    tabindex="-1"
  >
    <div class="flex w-full max-w-md flex-col rounded-2xl border border-stone-800 bg-stone-900 text-stone-100 shadow-2xl max-h-[85vh] overflow-hidden">
      <div class="flex items-center justify-between border-b border-stone-800/80 px-6 py-4">
        <div class="flex items-center space-x-3">
          <span class="text-2xl">📮</span>
          <div>
            <h3 class="text-lg font-bold text-rose-400">Buku Tamu</h3>
            <p class="text-xs text-stone-400">{entries.length} ucapan masuk</p>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="rounded-lg px-3 py-1.5 text-xs font-medium transition {showForm ? 'bg-rose-600 text-white' : 'bg-stone-800 text-stone-400 hover:text-stone-200'}" onclick={() => (showForm = true)}>Tulis</button>
          <button class="rounded-lg px-3 py-1.5 text-xs font-medium transition {!showForm ? 'bg-rose-600 text-white' : 'bg-stone-800 text-stone-400 hover:text-stone-200'}" onclick={() => (showForm = false)}>Baca</button>
        </div>
      </div>

      {#if showForm}
        <form onsubmit={(e) => { e.preventDefault(); submitForm() }} class="flex flex-col space-y-4 p-6">
          <div>
            <label for="gb-name" class="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-400">Nama Lengkap</label>
            <input id="gb-name" bind:value={form.name} type="text" required placeholder="Masukkan nama Anda" class="w-full rounded-xl border border-stone-800 bg-stone-950 px-4 py-2.5 text-sm text-stone-100 outline-none transition focus:border-rose-500 focus:ring-1 focus:ring-rose-500" />
          </div>
          <div>
            <label for="gb-attend" class="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-400">Kehadiran</label>
            <select id="gb-attend" bind:value={form.attendance} class="w-full rounded-xl border border-stone-800 bg-stone-950 px-4 py-2.5 text-sm text-stone-100 outline-none transition focus:border-rose-500 focus:ring-1 focus:ring-rose-500">
              <option value="Hadir">Hadir</option>
              <option value="Ragu-ragu">Ragu-ragu</option>
              <option value="Tidak Hadir">Tidak Hadir</option>
            </select>
          </div>
          <div>
            <label for="gb-msg" class="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-400">Ucapan & Doa</label>
            <textarea id="gb-msg" bind:value={form.message} rows="3" required placeholder="Tuliskan ucapan selamat menikah..." class="w-full resize-none rounded-xl border border-stone-800 bg-stone-950 px-4 py-2.5 text-sm text-stone-100 outline-none transition focus:border-rose-500 focus:ring-1 focus:ring-rose-500"></textarea>
          </div>
          <div class="flex space-x-3 pt-2">
            <button type="button" class="flex-1 rounded-xl bg-stone-800 py-2.5 text-sm font-medium text-stone-300 transition hover:bg-stone-700" onclick={closeModal}>Batal</button>
            <button type="submit" disabled={submitting} class="flex-1 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-900/40 transition hover:from-rose-500 hover:to-rose-400 disabled:opacity-60">{submitting ? 'Mengirim...' : 'Kirim Ucapan'}</button>
          </div>
          {#if submitError}<p class="text-center text-xs text-red-400">{submitError}</p>{/if}
        </form>
      {:else}
        <div class="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 max-h-96">
          {#if loading}
            <p class="text-center text-sm text-stone-500 py-8">Memuat ucapan...</p>
          {:else if entries.length === 0}
            <p class="text-center text-sm text-stone-500 py-8">Belum ada ucapan. Jadilah yang pertama!</p>
          {:else}
            {#each entries as entry}
              <div class="rounded-xl border border-stone-800/60 bg-stone-950/50 p-3">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-semibold text-rose-300">{entry.name}</p>
                  <span class="text-xs text-stone-600">{timeAgo(entry.created_at)}</span>
                </div>
                <p class="mt-1 text-xs text-stone-500">{entry.attendance}</p>
                <p class="mt-2 text-sm leading-relaxed text-stone-300">{entry.message}</p>
              </div>
            {/each}
          {/if}
        </div>
        <div class="border-t border-stone-800/80 p-4">
          <button class="w-full rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 py-2.5 text-sm font-semibold text-white transition hover:from-rose-500 hover:to-rose-400" onclick={closeModal}>Tutup</button>
        </div>
      {/if}
    </div>
  </div>
{/if}
