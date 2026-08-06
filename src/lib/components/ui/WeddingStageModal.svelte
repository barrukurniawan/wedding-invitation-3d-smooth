<script lang="ts">
  import { activeModal, guestName, openModal, closeModal } from '../../stores/gameState.svelte'
  import { weddingConfig } from '../../stores/weddingConfig.svelte'

  let showPayment = $state(false)
  let activeTab = $state<'info' | 'gallery'>('info')
  let countdown = $state('')

  $effect(() => {
    const target = new Date($weddingConfig.wedding_date).getTime()
    function update() {
      const diff = target - Date.now()
      if (diff <= 0) {
        countdown = 'Hari ini adalah hari pernikahan kami!'
        return
      }
      const days = Math.floor(diff / 86400000)
      const hours = Math.floor((diff % 86400000) / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      countdown = `${days} hari ${hours} jam ${minutes} menit ${seconds} detik`
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  })

  function showQris() {
    showPayment = true
  }
  function openGuestbook() {
    showPayment = false
    openModal('guestbook')
  }
  function handleClose() {
    showPayment = false
    activeTab = 'info'
    closeModal()
  }
  function shareWhatsApp() {
    const text = encodeURIComponent(
      `Undangan Pernikahan ${$weddingConfig.bride_name} & ${$weddingConfig.groom_name}\n` +
      `${$weddingConfig.akad_date}\n` +
      `${$weddingConfig.venue_address || $weddingConfig.akad_location}\n\n` +
      'Yuk hadir dan berikan doa restu!\n' +
      window.location.href
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }
</script>

{#if $activeModal === 'weddingStage'}
  <div
    class="modal-backdrop absolute inset-0 z-50 flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    onclick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    onkeydown={(e) => { if (e.code === 'Escape') handleClose() }}
    tabindex="-1"
  >
    <div class="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[1.5rem] w-panel">
      {#if showPayment}
        <button onclick={() => (showPayment = false)} class="modal-icon-button absolute left-3 top-3 z-10" aria-label="Kembali">←</button>
        <button onclick={handleClose} class="modal-icon-button absolute right-3 top-3 z-10" aria-label="Tutup">✕</button>
        <div class="space-y-4 p-5 text-center">
          <div class="flex items-start justify-between text-left">
            <div>
              <p class="text-xs uppercase tracking-[0.22em] text-[var(--deep-rose)]/65">Amplop Digital</p>
              <h4 class="mt-1 text-lg font-bold text-[var(--deep-rose)]">{$weddingConfig.bride_name} & {$weddingConfig.groom_name}</h4>
            </div>
          </div>
          <div class="mx-auto overflow-hidden rounded-xl bg-white p-2 shadow-lg">
            {#if $weddingConfig.qris_image}
              <img src={$weddingConfig.qris_image} alt="QRIS {$weddingConfig.bride_name} dan {$weddingConfig.groom_name}" class="mx-auto aspect-square w-48 rounded-lg object-cover" />
            {:else}
              <p class="p-8 text-xs text-stone-600">QRIS belum ditambahkan.</p>
            {/if}
          </div>
          <div class="payment-card rounded-xl p-3 text-left w-card">
            <div class="flex items-center justify-between gap-3">
              <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--deep-rose)]/65">Transfer {$weddingConfig.bank_name}</p>
              <span class="rounded-full bg-white/70 px-2 py-1 text-[0.65rem] font-semibold text-[var(--deep-rose)]/70">Rekening</span>
            </div>
            <p class="mt-2 font-mono text-lg font-semibold tracking-wide text-[var(--ink)]">{$weddingConfig.bank_account}</p>
            <p class="mt-0.5 text-xs text-[var(--ink)]/55">a/n {$weddingConfig.bank_holder}</p>
          </div>
          {#if $weddingConfig.maps_url}<a class="block text-xs text-[var(--rose)] hover:text-[var(--champagne)]" href={$weddingConfig.maps_url} target="_blank" rel="noreferrer">Buka lokasi di Google Maps</a>{/if}
        </div>
      {:else}
          <button onclick={handleClose} class="modal-icon-button absolute right-3 top-3 z-10" aria-label="Tutup">✕</button>

        <div class="px-5 pt-5 pb-3 text-center">
          <p class="text-base font-semibold text-[var(--deep-rose)]">Halo, {$guestName}.</p>
          <h3 class="countdown-copy mt-1 text-sm font-medium text-[var(--ink)]/70">{countdown} menuju hari pernikahan kami</h3>
        </div>

        <div class="relative mx-4 aspect-[4/3] overflow-hidden rounded-xl w-card">
          {#if $weddingConfig.wedding_photo}
            <img
              src={$weddingConfig.wedding_photo}
              alt="{$weddingConfig.bride_name} dan {$weddingConfig.groom_name}"
              class="h-full w-full object-cover"
            />
          {/if}
          <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#3b272b]/78 via-[#3b272b]/30 to-transparent px-4 pb-4 pt-12 text-center">
            <p class="font-display text-xl italic text-white">{$weddingConfig.bride_name} &amp; {$weddingConfig.groom_name}</p>
            <p class="mt-1 text-xs text-white/80">{$weddingConfig.akad_date}</p>
          </div>
        </div>

        <!-- Tabs -->
        <div class="mx-4 mt-3 flex rounded-lg p-1 w-card">
          <button
            class="flex-1 rounded-md py-1.5 text-xs font-medium w-tab {activeTab === 'info' ? 'w-tab-active' : ''}"
            onclick={() => (activeTab = 'info')}
          >Info Acara</button>
          <button
            class="flex-1 rounded-md py-1.5 text-xs font-medium w-tab {activeTab === 'gallery' ? 'w-tab-active' : ''}"
            onclick={() => (activeTab = 'gallery')}
          >Galeri</button>
        </div>

        <!-- Tab Content -->
        <div class="px-4 pt-2 pb-3">
          {#if activeTab === 'info'}
            <!-- Detail Acara -->
            <div class="space-y-3">
              <div class="rounded-xl p-3 w-card">
                <div class="flex items-center gap-2">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-wider text-[var(--champagne)]/90">Akad Nikah</p>
                    <p class="text-sm font-medium text-[var(--ivory)]">{$weddingConfig.akad_date}</p>
                    <p class="text-xs text-[var(--ivory)]/55">{$weddingConfig.akad_time}</p>
                    <p class="text-xs text-[var(--ivory)]/40">{$weddingConfig.akad_location}</p>
                  </div>
                </div>
              </div>
              <div class="rounded-xl p-3 w-card">
                <div class="flex items-center gap-2">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-wider text-[var(--champagne)]/90">Resepsi</p>
                    <p class="text-sm font-medium text-[var(--ivory)]">{$weddingConfig.resepsi_date}</p>
                    <p class="text-xs text-[var(--ivory)]/55">{$weddingConfig.resepsi_time}</p>
                    <p class="text-xs text-[var(--ivory)]/40">{$weddingConfig.resepsi_location}</p>
                  </div>
                </div>
              </div>
              <div class="rounded-xl p-3 w-card">
                <div class="flex items-center gap-2">
                  <div class="text-xs leading-relaxed text-[var(--ivory)]/80">
                    <p><span class="text-[var(--ivory)]/45">Mempelai Pria:</span> {$weddingConfig.groom_name} putra dari {$weddingConfig.groom_parents}</p>
                    <p class="mt-1"><span class="text-[var(--ivory)]/45">Mempelai Wanita:</span> {$weddingConfig.bride_name} putri dari {$weddingConfig.bride_parents}</p>
                  </div>
                </div>
              </div>
            </div>
          {:else if activeTab === 'gallery'}
            <div class="grid grid-cols-2 gap-2">
              {#each $weddingConfig.gallery_photos as photo, i}
                <div class="aspect-square overflow-hidden rounded-lg w-card">
                  <img
                    src={photo}
                    alt="Foto prewedding {i}"
                    class="h-full w-full object-cover"
                  />
                </div>
              {:else}
                <p class="col-span-2 py-8 text-center text-xs text-[var(--ivory)]/40">Galeri foto belum ditambahkan.</p>
              {/each}
            </div>
            <p class="mt-2 text-center text-xs text-[var(--ivory)]/40">Galeri prewedding</p>
          {/if}
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-2 px-4 pb-4">
          <button onclick={showQris} class="flex-1 rounded-lg py-2.5 text-xs font-semibold w-btn-ghost">
            QRIS / Rekening
          </button>
          <button onclick={openGuestbook} class="flex-1 rounded-lg py-2.5 text-xs font-semibold w-btn-primary">
            Tulis Ucapan
          </button>
          <button onclick={shareWhatsApp} class="rounded-lg border border-[#9bba9c]/60 bg-[#eef7ed] px-3 py-2.5 text-xs font-semibold text-[#47714c] transition hover:bg-white" title="Bagikan undangan" aria-label="Bagikan undangan">
             <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13" /></svg>
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    background: rgba(66, 43, 45, 0.3);
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
  }

  .modal-icon-button {
    display: grid;
    width: 2rem;
    height: 2rem;
    place-items: center;
    border: 1px solid rgba(196, 157, 91, 0.32);
    border-radius: 50%;
    background: rgba(255, 252, 248, 0.78);
    color: var(--deep-rose);
    font-size: 0.85rem;
    transition: transform 0.18s ease, background 0.18s ease;
  }

  .modal-icon-button:hover { background: white; transform: translateY(-1px); }
  .modal-icon-button:focus-visible { outline: 2px solid var(--champagne); outline-offset: 2px; }

  .countdown-copy {
    font-family: Outfit, 'Segoe UI', system-ui, sans-serif;
    font-variant-numeric: tabular-nums;
  }

  .payment-card {
    background: rgba(247, 239, 229, 0.72);
  }
</style>
