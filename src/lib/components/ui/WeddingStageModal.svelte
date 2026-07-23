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
    class="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    onclick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    onkeydown={(e) => { if (e.code === 'Escape') handleClose() }}
    tabindex="-1"
  >
    <div class="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl w-panel">
      {#if showPayment}
        <button onclick={() => (showPayment = false)} class="absolute left-3 top-3 z-10 rounded-full bg-black/35 px-2 py-1 text-sm text-[var(--ivory)]/80 backdrop-blur hover:text-[var(--ivory)]">←</button>
        <button onclick={handleClose} class="absolute right-3 top-3 z-10 rounded-full bg-black/35 px-2 py-1 text-sm text-[var(--ivory)]/80 backdrop-blur hover:text-[var(--ivory)]">✕</button>
        <div class="space-y-4 p-5 text-center">
          <div class="flex items-start justify-between text-left">
            <div>
              <p class="text-xs uppercase tracking-[0.22em] text-[var(--champagne)]/90">Amplop Digital</p>
              <h4 class="mt-1 text-lg font-bold text-[var(--ivory)]">{$weddingConfig.bride_name} & {$weddingConfig.groom_name}</h4>
            </div>
          </div>
          <div class="mx-auto overflow-hidden rounded-xl bg-white p-2 shadow-lg">
            {#if $weddingConfig.qris_image}
              <img src={$weddingConfig.qris_image} alt="QRIS {$weddingConfig.bride_name} dan {$weddingConfig.groom_name}" class="mx-auto aspect-square w-48 rounded-lg object-cover" />
            {:else}
              <p class="p-8 text-xs text-stone-600">QRIS belum ditambahkan.</p>
            {/if}
          </div>
          <div class="rounded-xl p-3 text-left text-sm w-card">
            <p class="text-[var(--ivory)]/55">Transfer {$weddingConfig.bank_name}</p>
            <p class="mt-1 font-mono text-base text-[var(--ivory)]">{$weddingConfig.bank_account}</p>
            <p class="text-xs text-[var(--ivory)]/40">a/n {$weddingConfig.bank_holder}</p>
          </div>
          {#if $weddingConfig.maps_url}<a class="block text-xs text-[var(--rose)] hover:text-[var(--champagne)]" href={$weddingConfig.maps_url} target="_blank" rel="noreferrer">Buka lokasi di Google Maps</a>{/if}
        </div>
      {:else}
        <button onclick={handleClose} class="absolute right-3 top-3 z-10 rounded-full bg-black/35 px-2 py-1 text-sm text-[var(--ivory)]/80 backdrop-blur hover:text-[var(--ivory)]">✕</button>

        <div class="px-5 pt-5 pb-3 text-center">
          <p class="text-base font-semibold text-[var(--rose)]">Halo, {$guestName}.</p>
          <h3 class="mt-1 font-serif text-lg text-[var(--champagne)]">{countdown} menuju hari pernikahan kami</h3>
        </div>

        <div class="relative mx-4 aspect-[4/3] overflow-hidden rounded-xl w-card">
          {#if $weddingConfig.wedding_photo}
            <img
              src={$weddingConfig.wedding_photo}
              alt="{$weddingConfig.bride_name} dan {$weddingConfig.groom_name}"
              class="h-full w-full object-cover"
            />
          {/if}
          <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-4 pb-4 pt-12 text-center">
            <p class="font-serif text-xl text-white">{$weddingConfig.bride_name} &amp; {$weddingConfig.groom_name}</p>
            <p class="mt-1 text-xs text-[var(--ivory)]/80">{$weddingConfig.akad_date}</p>
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
          <button onclick={shareWhatsApp} class="rounded-lg border border-emerald-600/50 bg-emerald-700/30 px-3 py-2.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-700/50" title="Bagikan undangan">
            📤
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}
