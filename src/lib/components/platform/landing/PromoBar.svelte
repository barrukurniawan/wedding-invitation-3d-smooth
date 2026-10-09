<script lang="ts">
  // Strip promo peluncuran: harga coret, hitung mundur besar, CTA. Sembunyi otomatis saat habis.
  import { onMount } from 'svelte'
  import type { PublicPricing } from '$lib/api-client'
  import { Countdown } from './countdown.svelte'
  import { discountPct, fmtIdr, pad2 } from './format'

  let { pricing, onCta }: { pricing: PublicPricing | null; onCta: () => void } = $props()

  const countdown = new Countdown(() => pricing?.promoEndsAt ?? null)
  onMount(() => countdown.start())

  const parts = $derived(countdown.parts)
  const show = $derived(Boolean(pricing?.promoActive && countdown.active))
  const pct = $derived(pricing?.normalPrice ? discountPct(pricing.normalPrice, pricing.currentPrice) : 0)
  const endsLabel = $derived(
    pricing?.promoEndsAt
      ? new Date(pricing.promoEndsAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })
      : '',
  )
</script>

{#if show && pricing && parts}
  <section class="promo" id="promo" aria-label="{pricing.promoLabel}">
    <div class="inner">
      <div class="copy">
        <span class="pill">
          <span class="dot" aria-hidden="true"></span>
          <span class="label-text">{pricing.promoLabel}</span>
        </span>
        <p class="price">
          <s>{fmtIdr(pricing.normalPrice ?? 0)}</s>
          <strong>{pricing.isFree ? 'GRATIS' : fmtIdr(pricing.currentPrice)}</strong>
          {#if !pricing.isFree}<span class="save">hemat {pct}%</span>{/if}
        </p>
        {#if pricing.afterPromoPrice != null}
          <p class="note">Setelah promo: {fmtIdr(pricing.afterPromoPrice)}</p>
        {/if}
      </div>

      <div class="timer" role="timer" aria-live="off" aria-label="Sisa waktu promo, berakhir {endsLabel}">
        {#each [[parts.days, 'Hari'], [parts.hours, 'Jam'], [parts.minutes, 'Menit'], [parts.seconds, 'Detik']] as [value, label] (label)}
          <div class="cell">
            <span class="digits">{pad2(Number(value))}</span>
            <span class="label">{label}</span>
          </div>
        {/each}
      </div>

      <button type="button" class="lp-btn gold" onclick={onCta}>
        {pricing.isFree ? 'Buat undangan gratis' : 'Ambil harga promo'}
      </button>
    </div>
  </section>
{/if}

<style>
  .promo {
    background: linear-gradient(120deg, #a52552 0%, var(--lp-maroon) 50%, var(--lp-maroon-deep) 100%);
    color: #fff;
  }
  .inner {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) auto auto;
    align-items: center;
    gap: 28px;
    max-width: var(--lp-max);
    margin: 0 auto;
    padding: 22px 24px;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px 7px 10px;
    border-radius: 999px;
    background: var(--lp-ink);
    color: #fff;
    font-size: 0.8rem;
    font-weight: 700;
    white-space: nowrap;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--lp-gold);
    animation: pulse 1.8s ease-out infinite;
  }
  .pill .label-text {
    color: var(--lp-gold);
  }
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(245, 185, 66, 0.6);
    }
    100% {
      box-shadow: 0 0 0 8px rgba(245, 185, 66, 0);
    }
  }
  .price {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 10px 14px;
    margin: 10px 0 0;
  }
  .price s {
    color: rgba(255, 255, 255, 0.65);
    font-size: 1.1rem;
  }
  .price strong {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(1.9rem, 3.2vw, 2.6rem);
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1;
  }
  .save {
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--lp-gold);
    color: var(--lp-ink);
    font-size: 0.8rem;
    font-weight: 800;
  }
  .note {
    margin: 8px 0 0;
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.85);
  }
  .timer {
    display: flex;
    gap: 8px;
  }
  .cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 64px;
    padding: 10px 8px 8px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.18);
  }
  .digits {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.9rem;
    font-weight: 700;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .label {
    margin-top: 4px;
    font-size: 0.68rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.75);
  }
  @media (max-width: 960px) {
    .inner {
      grid-template-columns: minmax(0, 1fr);
      gap: 16px;
      text-align: center;
    }
    .price {
      justify-content: center;
    }
    .timer {
      justify-content: center;
    }
    .lp-btn {
      justify-self: center;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .dot {
      animation: none;
    }
  }
  @media (max-width: 420px) {
    .cell {
      min-width: 58px;
    }
    .digits {
      font-size: 1.6rem;
    }
  }
</style>
