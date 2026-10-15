<script lang="ts">
  // Label kecil untuk tamu selama undangan masih masa uji coba (hilang setelah pemilik membayar).
  let { days = 3 }: { days?: number } = $props()
</script>

<a class="trial-badge" href="https://marryme.web.id" target="_blank" rel="noopener" aria-label="Undangan aktif {days} hari, dibuat dengan MarryMe">
  {days} Hari Aktif · <strong>MarryMe</strong>
</a>

<style>
  .trial-badge {
    position: fixed;
    left: 50%;
    bottom: calc(8px + env(safe-area-inset-bottom, 0px));
    z-index: 70;
    transform: translateX(-50%);
    padding: 4px 11px;
    border-radius: 999px;
    background: rgba(24, 19, 20, 0.62);
    color: #fff;
    font: 600 11px/1.3 'Outfit', 'Segoe UI', system-ui, sans-serif;
    letter-spacing: 0.01em;
    white-space: nowrap;
    text-decoration: none;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    opacity: 0.9;
  }
  .trial-badge strong {
    font-weight: 800;
  }
  .trial-badge:hover {
    opacity: 1;
  }
</style>
