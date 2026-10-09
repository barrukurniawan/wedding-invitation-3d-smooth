<script lang="ts">
  // Hero: satu kalimat jualan + 2 CTA + bukti sosial (angka asli) + mockup dunia 3D dengan callout.
  import { onMount } from 'svelte'
  import type { PublicPricing, PublicStats } from '$lib/api-client'
  import { fmtIdr, fmtNum } from './format'

  let {
    pricing,
    stats,
    demoUrl,
    busy = false,
    onCta,
  }: { pricing: PublicPricing | null; stats: PublicStats | null; demoUrl: string; busy?: boolean; onCta: () => void } = $props()

  // Video hanya di layar lebar & tanpa reduced-motion; selain itu cukup poster (hemat data HP).
  let playVideo = $state(false)
  // Video gameplay diputar bergantian: Taman lalu Pantai Sunset.
  const clips = [
    { src: '/media/hero-garden.mp4', label: 'kia-toni.marryme.web.id' },
    { src: '/media/hero-beach.mp4', label: 'kia-toni.marryme.web.id · venue Pantai' },
  ]
  let clip = $state(0)
  onMount(() => {
    const wide = window.matchMedia('(min-width: 900px)')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    playVideo = wide.matches && !reduce.matches
  })

  const ctaLabel = $derived(pricing && !pricing.isFree ? `Mulai ${fmtIdr(pricing.currentPrice)}` : 'Buat undangan gratis')
  const callouts = [
    { icon: '🚶', text: 'Tamu jalan-jalan ke pelaminan', pos: 'a' },
    { icon: '💌', text: 'RSVP & ucapan masuk sendiri', pos: 'b' },
    { icon: '🏝️', text: 'Pilih venue Taman atau Pantai', pos: 'c' },
  ]
</script>

<section class="hero">
  <div class="copy">
    <p class="lp-eyebrow">Undangan pernikahan 3D · tanpa install aplikasi</p>
    <h1>Undangan yang bisa <em>dijelajahi</em> tamu, bukan cuma dibaca.</h1>
    <p class="lead">
      Tamu berjalan ke pelaminan, menulis ucapan, dan RSVP di dunia 3D milik kalian sendiri. Cukup satu link
      yang dibagikan lewat WhatsApp.
    </p>
    <div class="ctas">
      <button type="button" class="lp-btn primary" disabled={busy} onclick={onCta}>
        {busy ? 'Menghubungkan ke Google…' : ctaLabel}
      </button>
      <a class="lp-btn ghost" href={demoUrl} target="_blank" rel="noreferrer">Coba demo 3D ↗</a>
    </div>
    {#if pricing?.promoActive && pricing.normalPrice}
      <p class="promo-hint">
        <s>{fmtIdr(pricing.normalPrice)}</s>
        <strong>{pricing.isFree ? 'Gratis' : fmtIdr(pricing.currentPrice)}</strong> selama {pricing.promoLabel?.toLowerCase()}
      </p>
    {/if}
    {#if stats}
      <ul class="proof" aria-label="Bukti penggunaan">
        <li><b>{fmtNum(stats.couples)}</b> pasangan sudah membuat undangan</li>
        <li><b>{fmtNum(stats.guestVisits)}</b> kunjungan tamu</li>
        <li><b>{fmtNum(stats.wishes)}</b> ucapan &amp; RSVP masuk</li>
      </ul>
    {/if}
  </div>

  <div class="visual" aria-hidden="true">
    <figure class="browser">
      <div class="chrome"><span></span><span></span><span></span><i>{clips[clip].label}</i></div>
      {#if playVideo}
        {#key clip}
          <video src={clips[clip].src} poster={clip === 0 ? '/media/hero-poster.webp' : undefined} autoplay muted playsinline preload="auto" onended={() => (clip = (clip + 1) % clips.length)}></video>
        {/key}
      {:else}
        <img src="/media/hero-poster.webp" alt="" loading="eager" decoding="async" />
      {/if}
    </figure>
    <figure class="phone">
      <span class="notch"></span>
      <img src="/media/features/mobile-3d.webp" alt="" loading="lazy" decoding="async" />
    </figure>
    {#each callouts as c (c.pos)}
      <span class="callout {c.pos}"><i>{c.icon}</i>{c.text}</span>
    {/each}
  </div>
</section>

<style>
  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
    align-items: center;
    gap: clamp(32px, 5vw, 64px);
    max-width: var(--lp-max);
    margin: 0 auto;
    padding: clamp(40px, 6vw, 80px) 24px clamp(48px, 6vw, 72px);
  }
  h1 {
    margin: 0;
    color: var(--lp-ink);
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(2.5rem, 5vw, 4.2rem);
    font-weight: 600;
    letter-spacing: -0.04em;
    line-height: 1.02;
    text-wrap: balance;
  }
  h1 em {
    color: var(--lp-maroon);
    font-style: italic;
    font-weight: 500;
  }
  .lead {
    max-width: 48ch;
    margin: 20px 0 0;
    color: var(--muted);
    font-size: clamp(1.02rem, 1.4vw, 1.15rem);
    line-height: 1.7;
  }
  .ctas {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 28px;
  }
  .promo-hint {
    margin: 14px 0 0;
    color: var(--muted);
    font-size: 0.92rem;
  }
  .promo-hint s {
    margin-right: 6px;
  }
  .promo-hint strong {
    color: var(--lp-maroon);
    font-weight: 800;
  }
  .proof {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 22px;
    margin: 26px 0 0;
    padding: 0;
    list-style: none;
    color: var(--muted);
    font-size: 0.9rem;
  }
  .proof li::before {
    content: '✦';
    margin-right: 6px;
    color: var(--lp-gold-deep);
  }
  .proof b {
    color: var(--lp-ink);
    font-weight: 800;
  }

  .visual {
    position: relative;
    min-height: 420px;
  }
  .browser {
    margin: 0;
    overflow: hidden;
    border-radius: 18px;
    background: #fff;
    border: 1px solid rgba(143, 29, 69, 0.1);
    box-shadow: 0 40px 80px -40px rgba(80, 44, 53, 0.55);
    transform: rotate(-1.5deg);
  }
  .chrome {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 9px 12px;
    background: #2b2225;
  }
  .chrome span {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #ff5f57;
  }
  .chrome span:nth-child(2) {
    background: #febc2e;
  }
  .chrome span:nth-child(3) {
    background: #28c840;
  }
  .chrome i {
    flex: 1;
    margin-left: 8px;
    padding: 4px 10px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.7rem;
    font-style: normal;
    font-family: ui-monospace, Menlo, monospace;
  }
  .browser video,
  .browser img {
    display: block;
    width: 100%;
    aspect-ratio: 16 / 9.4;
    object-fit: cover;
  }
  .phone {
    position: absolute;
    right: -6px;
    bottom: -28px;
    width: 31%;
    margin: 0;
    overflow: hidden;
    border-radius: 26px;
    border: 6px solid #1d1618;
    background: #1d1618;
    box-shadow: 0 30px 60px -28px rgba(0, 0, 0, 0.6);
    transform: rotate(3deg);
  }
  .phone .notch {
    position: absolute;
    top: 6px;
    left: 50%;
    width: 36%;
    height: 14px;
    border-radius: 999px;
    background: #1d1618;
    transform: translateX(-50%);
    z-index: 1;
  }
  .phone img {
    display: block;
    width: 100%;
    aspect-ratio: 496 / 768;
    object-fit: cover;
    border-radius: 20px;
  }
  .callout {
    position: absolute;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 14px 9px 10px;
    border-radius: 999px;
    background: #fff;
    color: var(--lp-ink);
    font-size: 0.82rem;
    font-weight: 700;
    box-shadow: 0 16px 36px -18px rgba(80, 44, 53, 0.55);
    border: 1px solid rgba(143, 29, 69, 0.1);
    white-space: nowrap;
    animation: float 5s ease-in-out infinite;
  }
  .callout i {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--lp-blush);
    font-style: normal;
    font-size: 0.85rem;
  }
  .callout.a {
    top: -18px;
    right: 6%;
  }
  .callout.b {
    top: 44%;
    left: -22px;
    animation-delay: -1.7s;
  }
  .callout.c {
    bottom: 8%;
    left: 10%;
    animation-delay: -3.1s;
  }
  @keyframes float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-6px);
    }
  }
  @media (max-width: 900px) {
    .hero {
      grid-template-columns: minmax(0, 1fr);
      padding-top: 32px;
    }
    .visual {
      min-height: 0;
      margin: 24px 8px 40px 0;
    }
    .callout.b {
      left: -4px;
    }
    .callout.a {
      right: 0;
    }
    .callout.c {
      bottom: -18px;
      left: 0;
    }
  }
  @media (max-width: 480px) {
    .callout {
      font-size: 0.74rem;
      padding: 7px 11px 7px 8px;
    }
    .phone {
      width: 36%;
      right: -4px;
      bottom: -22px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .callout {
      animation: none;
    }
  }
</style>
