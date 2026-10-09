<script lang="ts">
  // Modal login Google (menggantikan kartu login di hero lama).
  import { fade, scale } from 'svelte/transition'

  let {
    busy = false,
    error = '',
    onLogin,
    onClose,
  }: { busy?: boolean; error?: string; onLogin: () => void; onClose: () => void } = $props()
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && !busy && onClose()} />

<div class="overlay" transition:fade={{ duration: 120 }}>
  <button type="button" class="backdrop" aria-label="Tutup" onclick={onClose}></button>
  <div class="card" role="dialog" aria-modal="true" aria-labelledby="login-modal-title" transition:scale={{ duration: 160, start: 0.96 }}>
    <button type="button" class="close" aria-label="Tutup" onclick={onClose}>✕</button>
    <p class="label">Langkah 01 dari 04</p>
    <h2 id="login-modal-title">Masuk sekali klik</h2>
    <p class="copy">Simpan progres dan kelola undangan kalian. Gratis untuk memulai, tanpa kata sandi.</p>

    <button class="google" type="button" disabled={busy} aria-busy={busy} onclick={onLogin}>
      {#if busy}
        <span class="spinner" aria-hidden="true"></span>
        Menghubungkan ke Google…
      {:else}
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z" />
          <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.6c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.7A10.1 10.1 0 0 0 12 22Z" />
          <path fill="#FBBC05" d="M6.5 14a6 6 0 0 1 0-3.9V7.4H3.1a10 10 0 0 0 0 9.2L6.5 14Z" />
          <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10.1 10.1 0 0 0-8.9 5.4l3.4 2.7A5.9 5.9 0 0 1 12 6Z" />
        </svg>
        Lanjutkan dengan Google
      {/if}
    </button>
    {#if error}<p class="error" role="alert">{error}</p>{/if}

    <ul class="reassurance">
      <li>Satu akun untuk satu undangan</li>
      <li>Link undangan unik milik kalian</li>
      <li>Tetap privat sampai kalian siap membagikannya</li>
    </ul>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 70;
    display: grid;
    place-items: center;
    padding: 16px;
  }
  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(29, 22, 24, 0.5);
    backdrop-filter: blur(4px);
  }
  .card {
    position: relative;
    font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif;
    width: min(420px, 100%);
    padding: 30px 28px 26px;
    border-radius: 26px;
    background: #fffdfb;
    box-shadow: 0 40px 90px -30px rgba(0, 0, 0, 0.5);
  }
  .card button.close {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--lp-blush);
    color: var(--lp-maroon);
    font-size: 13px;
  }
  .label {
    margin: 0 0 8px;
    color: var(--gold);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }
  h2 {
    margin: 0;
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.9rem;
    font-weight: 600;
    letter-spacing: -0.03em;
    color: var(--lp-ink);
  }
  .copy {
    margin: 8px 0 20px;
    color: var(--muted);
    line-height: 1.6;
  }
  .card button.google {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 14px 18px;
    border-radius: 999px;
    background: var(--lp-maroon);
    color: #fff;
    font: 700 0.95rem/1 'Outfit', sans-serif;
  }
  .card button.google:hover:not(:disabled) {
    background: var(--lp-maroon-deep);
  }
  .card button.google:disabled {
    opacity: 0.7;
  }
  .card button.google svg {
    width: 18px;
    height: 18px;
    background: #fff;
    border-radius: 50%;
    padding: 2px;
  }
  .spinner {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-top-color: #fff;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .error {
    margin: 10px 0 0;
    color: #c0262d;
    font-size: 0.85rem;
  }
  .reassurance {
    margin: 20px 0 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: var(--muted);
    font-size: 0.88rem;
  }
  .reassurance li::before {
    content: '✓';
    margin-right: 8px;
    color: var(--lp-maroon);
    font-weight: 800;
  }
</style>
