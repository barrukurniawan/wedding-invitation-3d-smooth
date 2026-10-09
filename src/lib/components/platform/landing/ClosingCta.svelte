<script lang="ts">
  // CTA penutup + footer landing.
  import type { PublicPricing, PublicStats } from '$lib/api-client'
  import { fmtNum } from './format'

  let {
    pricing,
    stats,
    demoUrl,
    onCta,
  }: { pricing: PublicPricing | null; stats: PublicStats | null; demoUrl: string; onCta: () => void } = $props()

  const waHref = $derived(
    pricing?.whatsapp ? `https://wa.me/${pricing.whatsapp}?text=${encodeURIComponent('Halo MarryMe, saya mau tanya soal undangan 3D.')}` : null,
  )
  const year = new Date().getFullYear()
</script>

<section class="closing">
  <div class="lp-container">
    <div class="box">
      <h2>Siap membuat undangan yang dikenang tamu?</h2>
      <p>
        {#if pricing?.isFree && pricing.promoActive}
          Gratis selama {pricing.promoLabel?.toLowerCase()}. Mulai sekarang, bagikan saat kalian siap.
        {:else}
          Mulai sekarang, bagikan saat kalian siap.
        {/if}
      </p>
      <div class="actions">
        <button type="button" class="lp-btn gold" onclick={onCta}>{pricing?.isFree ? 'Buat undangan gratis' : 'Mulai sekarang'}</button>
        <a class="lp-btn ghost" href={demoUrl} target="_blank" rel="noreferrer">Lihat demo ↗</a>
      </div>
      {#if stats && stats.couples > 0}
        <p class="proof">Sudah dipakai {fmtNum(stats.couples)} pasangan · {fmtNum(stats.guestVisits)} kunjungan tamu</p>
      {/if}
    </div>
  </div>
</section>

<footer class="footer">
  <div class="lp-container grid">
    <div class="brand">
      <span class="wordmark">Marry<span>Me</span></span>
      <p>Undangan pernikahan 3D yang bisa dijelajahi tamu. Dibuat oleh Jago Institute.</p>
    </div>
    <div>
      <h4>Produk</h4>
      <a href="#desain">Desain</a>
      <a href="#fitur">Fitur</a>
      <a href="#harga">Harga</a>
      <a href="#faq">FAQ</a>
    </div>
    <div>
      <h4>Bantuan</h4>
      {#if waHref}<a href={waHref} target="_blank" rel="noreferrer">WhatsApp</a>{/if}
      <a href={demoUrl} target="_blank" rel="noreferrer">Demo undangan</a>
      <button type="button" onclick={onCta}>Masuk / daftar</button>
    </div>
  </div>
  <div class="lp-container copy">
    <span>© {year} MarryMe · marryme.web.id</span>
  </div>
</footer>

<style>
  .closing {
    padding-block: clamp(32px, 5vw, 64px) clamp(48px, 6vw, 80px);
  }
  .box {
    padding: clamp(36px, 6vw, 64px) 24px;
    border-radius: 32px;
    background: linear-gradient(135deg, #a52552, var(--lp-maroon) 55%, var(--lp-maroon-deep));
    color: #fff;
    text-align: center;
  }
  .box h2 {
    margin: 0 auto;
    max-width: 18ch;
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(1.9rem, 4vw, 2.9rem);
    font-weight: 600;
    letter-spacing: -0.03em;
    line-height: 1.1;
  }
  .box > p {
    margin: 14px auto 0;
    max-width: 48ch;
    color: rgba(255, 255, 255, 0.85);
    line-height: 1.6;
  }
  .actions {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 26px;
  }
  .box .lp-btn.ghost {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.3);
  }
  .proof {
    margin: 18px 0 0;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.75);
  }
  .footer {
    border-top: 1px solid rgba(143, 29, 69, 0.1);
    padding: 40px 0 28px;
    font-size: 0.9rem;
  }
  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr);
    gap: 28px;
  }
  .wordmark {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.03em;
    color: var(--lp-ink);
  }
  .wordmark span {
    color: var(--lp-maroon);
  }
  .brand p {
    margin: 10px 0 0;
    max-width: 36ch;
    color: var(--muted);
    line-height: 1.6;
  }
  h4 {
    margin: 0 0 10px;
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--lp-ink);
  }
  .footer a,
  .footer button {
    display: block;
    padding: 4px 0;
    color: var(--muted);
    text-decoration: none;
    background: none;
    font: inherit;
    cursor: pointer;
    text-align: left;
  }
  .footer a:hover,
  .footer button:hover {
    color: var(--lp-maroon);
  }
  .copy {
    margin-top: 28px;
    padding-top: 16px;
    border-top: 1px solid rgba(143, 29, 69, 0.08);
    color: var(--muted);
    font-size: 0.8rem;
  }
  @media (max-width: 720px) {
    .grid {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
    .brand {
      grid-column: 1 / -1;
    }
  }
</style>
