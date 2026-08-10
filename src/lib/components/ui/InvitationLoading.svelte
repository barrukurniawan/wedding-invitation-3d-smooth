<script lang="ts">
  import { onMount } from 'svelte'

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

  onMount(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById('startup-shell')?.remove()
      })
    })
  })
</script>

<div class="invitation-loading" role="status" aria-live="polite" aria-busy="true">
  <div class="loading-mark" aria-hidden="true">MARRYME</div>
  <h1>Menyiapkan undangan</h1>
  <p>Memuat ruang interaktif.</p>
  <div class="loading-track" role="progressbar" aria-label="Memuat undangan" aria-valuemin="0" aria-valuemax="100" aria-valuenow={pct}>
    <div class="loading-bar" style={`width: ${Math.max(6, pct)}%`}></div>
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
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .loading-mark {
    color: #c44565;
    font: 600 0.9rem/1 Georgia, 'Times New Roman', serif;
    letter-spacing: 0.18em;
  }

  h1 {
    margin: 1rem 0 0;
    color: #713645;
    font: 600 clamp(1.6rem, 6vw, 2.2rem)/1.05 Georgia, 'Times New Roman', serif;
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
    height: 0.3rem;
    margin-top: 2rem;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(113, 54, 69, 0.14);
  }

  .loading-bar {
    height: 100%;
    min-width: 0;
    border-radius: inherit;
    background: #d96b7a;
    transition: width 300ms ease-out;
  }

  @media (prefers-reduced-motion: reduce) {
    .loading-bar { transition: none; }
  }
</style>
