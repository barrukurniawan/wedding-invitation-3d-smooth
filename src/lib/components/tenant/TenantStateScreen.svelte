<script lang="ts">
  import { onMount } from 'svelte'

  let {
    state,
    message = '',
    reason = null,
    onRetry
  }: {
    state: 'loading' | 'private' | 'notFound' | 'expired' | 'suspended' | 'inactive' | 'error' | 'invalid'
    message?: string
    /** Undangan privat: alasan kode ditolak (lihat server/middleware/guestAccess.js). */
    reason?: string | null
    onRetry?: () => void
  } = $props()

  onMount(() => {
    document.getElementById('startup-shell')?.remove()
  })

  const content = $derived.by(() => {
    if (state === 'private') {
      if (reason === 'DEVICE_LIMIT') return { code: '', title: 'Link ini sudah dibuka di perangkat lain', detail: 'Link undangan pribadi hanya bisa dibuka di beberapa perangkat. Minta link undangan sendiri ke mempelai, atau minta mereka mereset perangkat untuk link ini.' }
      if (reason === 'LINK_REVOKED') return { code: '', title: 'Link undangan ini sudah tidak berlaku', detail: 'Silakan hubungi mempelai untuk mendapatkan link undangan yang baru.' }
      return { code: '', title: 'Maaf, undangan ini khusus untuk tamu undangan', detail: 'Undangan hanya bisa dibuka lewat link pribadi yang dikirim mempelai. Kalau kamu tamu undangan, buka lagi dari pesan yang kamu terima.' }
    }
    if (state === 'expired') return { code: '410', title: 'Undangan telah berakhir', detail: 'Masa aktif undangan ini sudah selesai.' }
    // Uji coba habis: tidak menyebut pembayaran ke tamu.
    if (state === 'inactive') return { code: '⏸', title: 'Undangan ini sedang tidak aktif', detail: 'Silakan hubungi pasangan pengantin atau coba lagi nanti.' }
    if (state === 'suspended') return { code: 'OFF', title: 'Undangan tidak tersedia', detail: 'Halaman ini sedang tidak dapat diakses.' }
    if (state === 'error') return { code: 'ERR', title: 'Gagal memuat undangan', detail: message || 'Terjadi kendala saat menghubungi server.' }
    if (state === 'loading') return { code: '3D', title: 'Menyiapkan undangan', detail: 'Memuat detail acara dan ruang interaktif.' }
    return { code: '404', title: 'Undangan tidak ditemukan', detail: 'Periksa kembali alamat undangan yang Anda buka.' }
  })
</script>

{#if state === 'private'}
<main class="private-gate">
  <div class="private-gate__card">
    <div class="private-gate__art" aria-hidden="true">
      <svg viewBox="0 0 120 96" width="120" height="96">
        <rect x="10" y="22" width="100" height="64" rx="8" fill="#fff8ef" stroke="#c9a46a" stroke-width="2"/>
        <path d="M12 26 60 60l48-34" fill="none" stroke="#c9a46a" stroke-width="2"/>
        <circle cx="60" cy="58" r="15" fill="#8f1d45"/>
        <rect x="53" y="56" width="14" height="10" rx="2" fill="#fff"/>
        <path d="M55.5 56v-3a4.5 4.5 0 0 1 9 0v3" fill="none" stroke="#fff" stroke-width="2"/>
      </svg>
    </div>
    <p class="private-gate__brand">UNDANGAN PRIVAT</p>
    <h1>{content.title}</h1>
    <p class="private-gate__detail">{content.detail}</p>
    <p class="private-gate__foot">Dibuat dengan <a href="https://marryme.web.id" rel="noreferrer">MarryMe</a></p>
  </div>
</main>
{:else}
<main class="tenant-state">
  <div class="tenant-state__frame">
    <p class="tenant-state__brand">MARRYME</p>
    <div class="tenant-state__code" aria-hidden="true">{content.code}</div>
    <h1>{content.title}</h1>
    <p class="tenant-state__detail">{content.detail}</p>
    {#if state === 'loading'}
      <div class="tenant-state__loader" aria-label="Memuat"></div>
    {:else if state === 'error' && onRetry}
      <button type="button" onclick={onRetry}>Coba lagi</button>
    {/if}
  </div>
</main>
{/if}

<style>
  .private-gate { min-height: 100svh; display: grid; place-items: center; padding: 24px 16px; background: radial-gradient(circle at 50% 0%, #fbe9ee 0%, #f4f0e8 60%); color: #2d2525; }
  .private-gate__card { width: min(100%, 440px); padding: 36px 28px 26px; border: 1px solid rgba(201, 164, 106, .35); border-radius: 24px; background: rgba(255, 255, 255, .78); box-shadow: 0 18px 50px rgba(143, 29, 69, .1); text-align: center; }
  .private-gate__art { display: flex; justify-content: center; margin-bottom: 18px; }
  .private-gate__brand { margin: 0; color: #a07a3c; font: 700 11px/1 system-ui, sans-serif; letter-spacing: .22em; }
  .private-gate h1 { margin: 12px 0 0; color: #8f1d45; font: 600 clamp(24px, 6.2vw, 30px)/1.2 Georgia, serif; }
  .private-gate__detail { margin: 14px auto 0; max-width: 360px; color: #6d6260; font: 400 15px/1.6 system-ui, sans-serif; }
  .private-gate__foot { margin: 26px 0 0; color: #a3979a; font: 400 12px/1 system-ui, sans-serif; }
  .private-gate__foot a { color: #8f1d45; font-weight: 600; text-decoration: none; }
  .tenant-state { min-height: 100svh; display: grid; place-items: center; padding: 24px; background: #f4f0e8; color: #20201e; }
  .tenant-state__frame { width: min(100%, 520px); border-left: 4px solid #bf3151; padding: 12px 0 12px 28px; }
  .tenant-state__brand { margin: 0 0 44px; color: #bf3151; font: 700 12px/1 system-ui, sans-serif; letter-spacing: .18em; }
  .tenant-state__code { color: #bf3151; font: 700 56px/1 Georgia, serif; }
  h1 { margin: 14px 0 0; font: 600 clamp(28px, 7vw, 44px)/1.05 Georgia, serif; letter-spacing: 0; }
  .tenant-state__detail { max-width: 420px; margin: 16px 0 0; color: #65645f; font: 400 15px/1.6 system-ui, sans-serif; }
  button { margin-top: 28px; border: 0; border-radius: 4px; padding: 11px 18px; background: #20201e; color: white; font: 600 14px/1 system-ui, sans-serif; cursor: pointer; }
  .tenant-state__loader { width: 180px; height: 3px; margin-top: 30px; overflow: hidden; background: #d8d2c8; }
  .tenant-state__loader::after { display: block; width: 42%; height: 100%; background: #bf3151; content: ''; animation: load 1s ease-in-out infinite; }
  @keyframes load { from { transform: translateX(-100%); } to { transform: translateX(340%); } }
  @media (prefers-reduced-motion: reduce) { .tenant-state__loader::after { animation-duration: 2.5s; } }
</style>
