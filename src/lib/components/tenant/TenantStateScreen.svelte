<script lang="ts">
  let {
    state,
    message = '',
    onRetry
  }: {
    state: 'loading' | 'notFound' | 'expired' | 'suspended' | 'error' | 'invalid'
    message?: string
    onRetry?: () => void
  } = $props()

  const content = $derived.by(() => {
    if (state === 'expired') return { code: '410', title: 'Undangan telah berakhir', detail: 'Masa aktif undangan ini sudah selesai.' }
    if (state === 'suspended') return { code: 'OFF', title: 'Undangan tidak tersedia', detail: 'Halaman ini sedang tidak dapat diakses.' }
    if (state === 'error') return { code: 'ERR', title: 'Gagal memuat undangan', detail: message || 'Terjadi kendala saat menghubungi server.' }
    if (state === 'loading') return { code: '3D', title: 'Menyiapkan undangan', detail: 'Memuat detail acara dan ruang interaktif.' }
    return { code: '404', title: 'Undangan tidak ditemukan', detail: 'Periksa kembali alamat undangan yang Anda buka.' }
  })
</script>

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

<style>
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
