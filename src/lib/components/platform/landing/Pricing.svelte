<script lang="ts">
  // Bagian harga: satu paket dengan harga coret + promo, daftar fitur, catatan cara bayar.
  import type { PublicPricing } from '$lib/api-client'
  import { discountPct, fmtIdr } from './format'

  let { pricing, onCta }: { pricing: PublicPricing | null; onCta: () => void } = $props()

  const features = [
    'Link sendiri: nama-kalian.marryme.web.id',
    'Dunia 3D (venue Taman / Pantai) atau 2D pixel, bisa ganti kapan saja',
    'Buku tamu & RSVP dengan statistik',
    'Galeri foto & musik latar',
    'Amplop digital: QRIS & rekening',
    'Kirim via WhatsApp + QR code undangan',
    'Aktif sampai 7 hari setelah resepsi',
    'Chat bantuan langsung dengan admin',
  ]

  const pct = $derived(pricing?.normalPrice ? discountPct(pricing.normalPrice, pricing.currentPrice) : 0)
  const endsLabel = $derived(
    pricing?.promoEndsAt
      ? new Date(pricing.promoEndsAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', timeZone: 'Asia/Jakarta' })
      : '',
  )
</script>

<section class="pricing lp-section" id="harga" aria-labelledby="pricing-title">
  <div class="lp-container">
    <div class="lp-section-head">
      <p class="lp-eyebrow">Harga</p>
      <h2 id="pricing-title">Sekali bayar, tanpa langganan</h2>
      <p>Satu paket berisi semua fitur. Tidak ada biaya tersembunyi, tidak ada watermark.</p>
    </div>

    <div class="card">
      <div class="left">
        <p class="name">Undangan MarryMe</p>
        {#if pricing?.promoActive && pricing.normalPrice}
          <p class="promo-tag">🎉 {pricing.promoLabel} · sampai {endsLabel}</p>
          <p class="price">
            <s>{fmtIdr(pricing.normalPrice)}</s>
            <strong>{pricing.isFree ? 'GRATIS' : fmtIdr(pricing.currentPrice)}</strong>
          </p>
          <p class="save">{pricing.isFree ? `Hemat ${fmtIdr(pricing.normalPrice)}` : `Hemat ${pct}%`}{#if pricing.afterPromoPrice != null} · setelah promo {fmtIdr(pricing.afterPromoPrice)}{/if}</p>
        {:else if pricing}
          <p class="price"><strong>{pricing.isFree ? 'GRATIS' : fmtIdr(pricing.currentPrice)}</strong></p>
          <p class="save">per undangan, sekali bayar</p>
        {/if}

        <button type="button" class="lp-btn primary big" onclick={onCta}>
          {pricing?.isFree ? 'Buat undangan gratis' : 'Mulai sekarang'}
        </button>
        <p class="note">
          {#if pricing?.isFree}
            Undangan langsung aktif setelah dibuat. Tidak perlu kartu kredit.
          {:else}
            Bayar via transfer bank, lalu unggah bukti. Admin memverifikasi dan undangan aktif.
          {/if}
        </p>
      </div>

      <ul class="features">
        {#each features as f (f)}<li>{f}</li>{/each}
      </ul>
    </div>
  </div>
</section>

<style>
  .card {
    display: grid;
    grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
    gap: clamp(24px, 4vw, 48px);
    max-width: 960px;
    margin: 0 auto;
    padding: clamp(26px, 4vw, 44px);
    border-radius: 30px;
    background: #fff;
    border: 2px solid var(--lp-maroon);
    box-shadow: 0 40px 80px -44px rgba(143, 29, 69, 0.5);
    position: relative;
  }
  .card::before {
    content: 'Paling lengkap';
    position: absolute;
    top: -14px;
    left: 28px;
    padding: 5px 12px;
    border-radius: 999px;
    background: var(--lp-maroon);
    color: #fff;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .name {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--lp-ink);
  }
  .promo-tag {
    display: inline-block;
    margin: 12px 0 0;
    padding: 5px 11px;
    border-radius: 999px;
    background: var(--lp-gold);
    color: var(--lp-ink);
    font-size: 0.78rem;
    font-weight: 800;
  }
  .price {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 12px;
    margin: 14px 0 0;
  }
  .price s {
    color: var(--muted);
    font-size: 1.15rem;
  }
  .price strong {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(2.6rem, 5vw, 3.6rem);
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1;
    color: var(--lp-maroon);
  }
  .save {
    margin: 8px 0 0;
    color: var(--muted);
    font-size: 0.92rem;
  }
  .big {
    margin-top: 22px;
    width: 100%;
    padding: 16px 24px;
    font-size: 1.02rem;
  }
  .note {
    margin: 12px 0 0;
    color: var(--muted);
    font-size: 0.85rem;
    line-height: 1.55;
  }
  .features {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 0;
    padding: 0 0 0 0;
    list-style: none;
    align-self: center;
  }
  .features li {
    display: flex;
    gap: 10px;
    color: var(--lp-ink);
    font-size: 0.95rem;
    line-height: 1.5;
  }
  .features li::before {
    content: '✓';
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--lp-blush);
    color: var(--lp-maroon);
    font-size: 0.8rem;
    font-weight: 800;
  }
  @media (max-width: 760px) {
    .card {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
