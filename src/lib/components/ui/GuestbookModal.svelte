<script lang="ts">
  import { activeModal, closeModal, setGuestName } from '../../stores/gameState.svelte'
  import { submitGuestbook } from '../../services/api'

  let form = $state({ name: '', attendance: 'Hadir', message: '' })

  async function submitForm() {
    setGuestName(form.name)
    await submitGuestbook(form)
    alert(`Terima kasih ${form.name} atas ucapannya!\n\n"${form.message}"\nStatus: ${form.attendance}`)
    form = { name: '', attendance: 'Hadir', message: '' }
    closeModal()
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
    <div class="flex w-full max-w-md flex-col space-y-5 rounded-2xl border border-stone-800 bg-stone-900 p-6 text-stone-100 shadow-2xl">
      <div class="flex items-center space-x-3 border-b border-stone-800/80 pb-4">
        <span class="text-2xl">📮</span>
        <div>
          <h3 class="text-lg font-bold text-rose-400">Buku Tamu Pernikahan</h3>
          <p class="text-xs text-stone-400">Tuliskan ucapan selamat & doa restumu</p>
        </div>
      </div>

      <form onsubmit={(e) => { e.preventDefault(); submitForm() }} class="flex flex-col space-y-4">
        <div>
          <label for="gb-name" class="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-400">Nama Lengkap</label>
          <input
            id="gb-name"
            bind:value={form.name}
            type="text"
            required
            placeholder="Masukkan nama Anda"
            class="w-full rounded-xl border border-stone-800 bg-stone-950 px-4 py-2.5 text-sm text-stone-100 outline-none transition focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
          />
        </div>

        <div>
          <label for="gb-attend" class="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-400">Kehadiran</label>
          <select
            id="gb-attend"
            bind:value={form.attendance}
            class="w-full rounded-xl border border-stone-800 bg-stone-950 px-4 py-2.5 text-sm text-stone-100 outline-none transition focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
          >
            <option value="Hadir">Hadir</option>
            <option value="Ragu-ragu">Ragu-ragu</option>
            <option value="Tidak Hadir">Tidak Hadir</option>
          </select>
        </div>

        <div>
          <label for="gb-msg" class="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-400">Ucapan & Doa</label>
          <textarea
            id="gb-msg"
            bind:value={form.message}
            rows="3"
            required
            placeholder="Tuliskan ucapan selamat menikah..."
            class="w-full resize-none rounded-xl border border-stone-800 bg-stone-950 px-4 py-2.5 text-sm text-stone-100 outline-none transition focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
          ></textarea>
        </div>

        <div class="flex space-x-3 pt-2">
          <button type="button" class="flex-1 rounded-xl bg-stone-800 py-2.5 text-sm font-medium text-stone-300 transition hover:bg-stone-700" onclick={closeModal}>
            Batal
          </button>
          <button type="submit" class="flex-1 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-900/40 transition hover:from-rose-500 hover:to-rose-400">
            Kirim Ucapan
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
