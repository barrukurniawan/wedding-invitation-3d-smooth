<script lang="ts">
  // Tombol WhatsApp mengambang untuk calon pengguna (hanya di landing, saat belum login).
  let { number, text = 'Halo MarryMe, saya mau tanya soal undangan 3D.' }: { number: string; text?: string } = $props()
  const href = $derived(`https://wa.me/${number}?text=${encodeURIComponent(text)}`)
</script>

<a class="wa" {href} target="_blank" rel="noreferrer" aria-label="Tanya via WhatsApp">
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 1.8a8.2 8.2 0 1 1-4.2 15.3l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 0 1 12 3.8zm-3 4.4c-.2 0-.5 0-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.2 5 4.4 2.5 1 3 .8 3.5.7.5 0 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4l-.5-.3-1.8-.9c-.3-.1-.4-.1-.6.1l-.8 1c-.2.2-.3.2-.6.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.3-.4.7-1.3.1-.2 0-.4 0-.5l-.8-2c-.2-.5-.4-.4-.6-.4H9z" />
  </svg>
  <span>Tanya via WhatsApp</span>
</a>

<style>
  .wa {
    position: fixed;
    right: 20px;
    bottom: calc(20px + env(safe-area-inset-bottom, 0px));
    z-index: 60;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 18px 12px 14px;
    border-radius: 999px;
    background: #25a35a;
    color: #fff;
    font: 700 0.9rem/1 'Outfit', 'Segoe UI', system-ui, sans-serif;
    text-decoration: none;
    box-shadow: 0 14px 30px -12px rgba(37, 163, 90, 0.7);
    transition: transform 0.15s, background 0.15s;
  }
  .wa:hover {
    background: #1e8a4b;
    transform: translateY(-2px);
  }
  @media (max-width: 520px) {
    .wa span {
      display: none;
    }
    .wa {
      padding: 14px;
      right: 16px;
      bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    }
  }
</style>
