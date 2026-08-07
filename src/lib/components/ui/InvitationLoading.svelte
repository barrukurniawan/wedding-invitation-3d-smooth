<script lang="ts">
  let {
    brideName = '',
    groomName = '',
    progress = 0,
  }: {
    brideName?: string
    groomName?: string
    progress?: number
  } = $props()

  const pct = $derived(Math.round(Math.max(0, Math.min(1, progress)) * 100))
  const couple = $derived(brideName && groomName ? `${brideName.toUpperCase()} & ${groomName.toUpperCase()}` : '')
</script>

<div class="invitation-loading" role="status" aria-live="polite" aria-busy="true">
  <div class="loading-mark" aria-hidden="true">MARRYME</div>
  <h1>Menyiapkan undangan</h1>
  <p>
    {#if couple}
      Memuat undangan pernikahan {couple}.
    {:else}
      Memuat ruang interaktif.
    {/if}
  </p>
  <div class="loading-track" role="progressbar" aria-label="Memuat undangan" aria-valuemin="0" aria-valuemax="100" aria-valuenow={pct}>
    <div class="loading-bar" style={`width: ${Math.max(8, pct)}%`}></div>
  </div>
</div>

<style>
  .invitation-loading {
    position: absolute;
    inset: 0;
    z-index: 50;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: 2rem;
    background: linear-gradient(160deg, #fff8ef 0%, #fbe6d8 55%, #f3cdbf 100%);
    color: #2a1f24;
    text-align: center;
    font-family: Outfit, 'Segoe UI', system-ui, sans-serif;
  }

  .loading-mark {
    color: #c44565;
    font: 600 0.9rem/1 'Playfair Display', Georgia, serif;
    letter-spacing: 0.18em;
    animation: loading-pulse 1.2s ease-in-out infinite;
  }

  h1 {
    margin: 1rem 0 0;
    color: #713645;
    font: 600 clamp(1.6rem, 6vw, 2.2rem)/1.05 'Playfair Display', Georgia, serif;
  }

  p {
    max-width: 22rem;
    margin: 0.75rem 0 0;
    color: #806e72;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .loading-track {
    width: min(22rem, 100%);
    height: 0.375rem;
    margin-top: 2rem;
    overflow: hidden;
    border: 1px solid rgba(196, 157, 91, 0.3);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.5);
  }

  .loading-bar {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #d96b7a, #c9a45e);
    transition: width 300ms ease-out;
  }

  @keyframes loading-pulse {
    50% { transform: scale(1.08); opacity: 0.72; }
  }

  @media (prefers-reduced-motion: reduce) {
    .loading-mark { animation-duration: 2.5s; }
    .loading-bar { transition: none; }
  }
</style>
