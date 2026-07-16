<script lang="ts">
  import { activeModal, guestName, openModal, closeModal } from '../../stores/gameState.svelte'

  let showPayment = $state(false)

  function showQris() {
    showPayment = true
  }
  function openGuestbook() {
    showPayment = false
    openModal('guestbook')
  }
  function handleClose() {
    showPayment = false
    closeModal()
  }
</script>

{#if $activeModal === 'weddingStage'}
  <div
    class="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    onclick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    onkeydown={(e) => { if (e.code === 'Escape') handleClose() }}
    tabindex="-1"
  >
    <div class="relative w-full max-w-md overflow-hidden rounded-2xl border border-rose-200/20 bg-stone-950 text-stone-100 shadow-2xl">
      <button onclick={handleClose} class="absolute right-3 top-3 z-10 rounded-full bg-black/35 px-2 py-1 text-sm text-white/80 backdrop-blur hover:text-white">✕</button>

      <div class="px-5 pt-5 pb-3 text-center">
        <p class="text-base font-semibold text-rose-100">Halo, {$guestName}.</p>
        <h3 class="mt-1 font-serif text-lg text-white">Selamat datang di pelaminan Kia & Toni</h3>
      </div>

      <div class="relative mx-4 aspect-[4/3] overflow-hidden rounded-xl bg-stone-900">
        <img
          src="https://i.pinimg.com/736x/29/63/e1/2963e125ebb7c0d22a9b420a02e18c71.jpg"
          alt="Kia Anindya dan Toni Pratama"
          class="h-full w-full object-cover"
        />
        <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-4 pb-4 pt-12 text-center">
          <p class="font-serif text-xl text-white">Kia Anindya &amp; Toni Pratama</p>
          <p class="mt-1 text-xs text-stone-200">15 Juli 2026</p>
        </div>
      </div>

      <div class="flex gap-2 p-4">
        <button onclick={showQris} class="flex-1 rounded-lg border border-stone-700 bg-stone-800 py-2.5 text-xs font-semibold text-stone-200 transition hover:bg-stone-700">
          QRIS / Rekening
        </button>
        <button onclick={openGuestbook} class="flex-1 rounded-lg bg-rose-600 py-2.5 text-xs font-semibold text-white transition hover:bg-rose-500">
          Tulis Ucapan
        </button>
      </div>

      {#if showPayment}
        <div class="absolute inset-0 z-10 flex items-center justify-center bg-stone-950/95 p-6 backdrop-blur-md">
          <div class="w-full max-w-sm space-y-4 rounded-2xl border border-rose-400/30 bg-stone-900 p-5 text-center shadow-2xl">
            <div class="flex items-start justify-between text-left">
              <div>
                <p class="text-xs uppercase tracking-[0.22em] text-rose-300">Amplop Digital</p>
                <h4 class="mt-1 text-lg font-bold text-white">Kia & Toni</h4>
              </div>
              <button onclick={() => (showPayment = false)} class="text-stone-400 hover:text-white">✕</button>
            </div>
            <div class="mx-auto overflow-hidden rounded-xl bg-white p-2 shadow-lg">
              <img
                src="https://d2v6npc8wmnkqk.cloudfront.net/storage/26035/conversions/Tipe-QRIS-statis-small-large.jpg"
                alt="QRIS Kia dan Toni"
                class="mx-auto aspect-square w-48 rounded-lg object-cover"
              />
            </div>
            <div class="rounded-xl border border-stone-700 bg-stone-950 p-3 text-left text-sm">
              <p class="text-stone-400">Transfer BCA</p>
              <p class="mt-1 font-mono text-base text-white">1234567890</p>
              <p class="text-xs text-stone-500">a/n Toni Pratama</p>
            </div>
            <p class="text-xs leading-relaxed text-stone-400">Kode ini hanya tampilan contoh. Ganti dengan QRIS resmi dan rekening produksi sebelum undangan dibagikan.</p>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
