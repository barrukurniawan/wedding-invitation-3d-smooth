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
  <div
    class="loading-track"
    role="progressbar"
    aria-label="Memuat undangan"
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow={pct}
    style={`--progress: ${pct}%`}
  >
    <div class="loading-bar"></div>
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
    width: min(22rem, calc(100vw - 4rem));
    height: 20px;
    margin-top: 2rem;
    overflow: hidden;
    border: 0;
    border-radius: 999px;
    background: repeating-linear-gradient(135deg, #ddd 0 10px, #eee 0 20px);
    box-shadow: inset 0 1px 2px rgba(74, 53, 59, 0.12), 0 4px 12px rgba(113, 54, 69, 0.1);
  }

  .loading-bar {
    height: 100%;
    width: var(--progress);
    min-width: 0;
    border-radius: inherit;
    background: repeating-linear-gradient(135deg, #f03355 0 10px, #ffa516 0 20px);
    background-size: 200% 100%;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.32);
    transition: width 300ms ease-out;
    animation: stripe-shimmer 2s linear infinite;
  }

  @keyframes loading-pulse {
    50% { transform: scale(1.08); opacity: 0.72; }
  }

  @keyframes stripe-shimmer {
    from { background-position: 0 0; }
    to { background-position: 40px 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .loading-mark { animation-duration: 2.5s; }
    .loading-bar { animation: none; transition: none; }
  }
</style>
