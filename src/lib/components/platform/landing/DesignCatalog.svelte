<script lang="ts">
  // Katalog desain: 3 kartu (3D Taman, 3D Pantai, 2D) dengan harga coret/promo dan badge.
  import type { PublicPricing } from '$lib/api-client'
  import { fmtIdr } from './format'

  let {
    pricing,
    demoUrl,
    demoBeachUrl = null,
    demo2dUrl = '/presets/garden-2d/index.html',
    onSelect,
  }: {
    pricing: PublicPricing | null
    demoUrl: string
    demoBeachUrl?: string | null
    demo2dUrl?: string
    onSelect: () => void
  } = $props()

  type Card = { id: string; tag: string; tone: 'gold' | 'new' | 'light'; title: string; sub: string; desc: string; img: string; chips: string[]; demo: string | null }

  const cards = $derived<Card[]>([
    {
      id: 'garden',
      tag: 'Terlaris',
      tone: 'gold',
      title: 'Summer Fantasy Island',
      sub: '3D · Venue Taman',
      desc: 'Taman tropis sore hari: tamu berjalan menyusuri karpet merah menuju pelaminan, lengkap dengan lampu gantung dan pegunungan.',
      img: '/media/designs/garden.webp',
      chips: ['Joystick & WASD', 'Pelaminan + confetti', 'Buku tamu 3D'],
      demo: demoUrl,
    },
    {
      id: 'beach',
      tag: 'Baru',
      tone: 'new',
      title: 'Pantai Sunset',
      sub: '3D · Venue Pantai',
      desc: 'Pulau pasir di tengah laut dengan matahari terbenam, pohon kelapa, dan karpet biru laut. Bisa diganti dari Taman kapan saja.',
      img: '/media/designs/beach.webp',
      chips: ['Matahari terbenam', 'Laut & pohon kelapa', 'Karang & kerang'],
      demo: demoBeachUrl,
    },
    {
      id: '2d',
      tag: 'Super ringan',
      tone: 'light',
      title: 'Pixel Garden RPG',
      sub: '2D · Pixel art',
      desc: 'Taman pernikahan retro pixel art yang lancar di HP lama sekalipun, dengan danau romantis dan multiplayer real-time.',
      img: '/media/designs/2d.webp',
      chips: ['Ringan di HP lama', 'Multiplayer realtime', 'Pianis & danau'],
      demo: demo2dUrl,
    },
  ])

  const current = $derived(pricing ? (pricing.isFree ? 'GRATIS' : fmtIdr(pricing.currentPrice)) : null)
</script>

<section class="catalog lp-section" id="desain" aria-labelledby="catalog-title">
  <div class="lp-container">
    <div class="lp-section-head">
      <p class="lp-eyebrow">Pilih desain</p>
      <h2 id="catalog-title">Tiga dunia, satu link undangan</h2>
      <p>Semua desain harganya sama dan bisa diganti kapan saja dari dashboard tanpa mengetik ulang data.</p>
    </div>

    <div class="grid">
      {#each cards as card (card.id)}
        <article class="card">
          <div class="shot">
            <img src={card.img} alt="Pratinjau desain {card.title}" loading="lazy" decoding="async" />
            <span class="tag {card.tone}">{card.tag}</span>
          </div>
          <div class="body">
            <p class="sub">{card.sub}</p>
            <h3>{card.title}</h3>
            <p class="desc">{card.desc}</p>
            <ul class="chips">
              {#each card.chips as chip (chip)}<li>{chip}</li>{/each}
            </ul>

            <div class="price" aria-label="Harga">
              {#if pricing?.promoActive && pricing.normalPrice}
                <s>{fmtIdr(pricing.normalPrice)}</s>
                <strong>{current}</strong>
                <span class="promo">{pricing.promoLabel}</span>
              {:else if current}
                <strong>{current}</strong>
              {/if}
            </div>

            <div class="actions">
              {#if card.demo}
                <a class="lp-btn ghost sm" href={card.demo} target="_blank" rel="noreferrer">Demo ↗</a>
              {:else}
                <span class="soon">Tersedia saat membuat undangan</span>
              {/if}
              <button type="button" class="lp-btn primary sm" onclick={onSelect}>Pilih desain</button>
            </div>
          </div>
        </article>
      {/each}
    </div>
  </div>
</section>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 20px;
  }
  .card {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: var(--lp-radius);
    background: #fff;
    border: 1px solid rgba(143, 29, 69, 0.1);
    box-shadow: 0 24px 50px -36px rgba(80, 44, 53, 0.45);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .card:hover {
    transform: translateY(-4px);
    box-shadow: 0 34px 60px -34px rgba(80, 44, 53, 0.55);
  }
  .shot {
    position: relative;
    overflow: hidden;
    aspect-ratio: 16 / 10;
    background: var(--lp-blush);
  }
  .shot img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }
  .card:hover .shot img {
    transform: scale(1.04);
  }
  .tag {
    position: absolute;
    top: 12px;
    left: 12px;
    padding: 5px 11px;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    backdrop-filter: blur(6px);
  }
  .tag.gold {
    background: var(--lp-gold);
    color: var(--lp-ink);
  }
  .tag.new {
    background: var(--lp-maroon);
    color: #fff;
  }
  .tag.light {
    background: rgba(255, 255, 255, 0.9);
    color: #1f6b3f;
  }
  .body {
    display: flex;
    flex-direction: column;
    flex: 1;
    padding: 18px 20px 20px;
  }
  .sub {
    margin: 0 0 4px;
    color: var(--lp-maroon);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  h3 {
    margin: 0;
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.45rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--lp-ink);
  }
  .desc {
    margin: 10px 0 0;
    color: var(--muted);
    font-size: 0.92rem;
    line-height: 1.6;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 14px 0 0;
    padding: 0;
    list-style: none;
  }
  .chips li {
    padding: 5px 10px;
    border-radius: 999px;
    background: var(--lp-blush);
    color: var(--lp-maroon-deep);
    font-size: 0.76rem;
    font-weight: 600;
  }
  .price {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: auto;
    padding-top: 18px;
  }
  .price s {
    color: var(--muted);
    font-size: 0.9rem;
  }
  .price strong {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.7rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--lp-maroon);
    line-height: 1;
  }
  .price .promo {
    padding: 3px 9px;
    border-radius: 999px;
    background: var(--lp-gold);
    color: var(--lp-ink);
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 14px;
  }
  .soon {
    color: var(--muted);
    font-size: 0.78rem;
  }
  @media (max-width: 1000px) {
    .grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 640px) {
    .grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
