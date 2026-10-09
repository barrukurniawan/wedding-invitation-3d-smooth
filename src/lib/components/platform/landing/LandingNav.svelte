<script lang="ts">
  // Nav sticky landing: logo, anchor bagian, pill promo dengan hitung mundur ringkas, tombol Masuk.
  import { onMount } from 'svelte'
  import type { PublicPricing } from '$lib/api-client'
  import { Countdown } from './countdown.svelte'

  let { pricing, busy = false, onLogin }: { pricing: PublicPricing | null; busy?: boolean; onLogin: () => void } = $props()

  const countdown = new Countdown(() => pricing?.promoEndsAt ?? null)
  let scrolled = $state(false)
  let menuOpen = $state(false)

  onMount(() => {
    const stop = countdown.start()
    const onScroll = () => (scrolled = window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      stop()
      window.removeEventListener('scroll', onScroll)
    }
  })

  const parts = $derived(countdown.parts)
  const compact = $derived(
    parts ? (parts.days > 0 ? `${parts.days} hari ${parts.hours} jam` : `${parts.hours} jam ${parts.minutes} mnt`) : '',
  )
  const links = [
    ['#desain', 'Desain'],
    ['#fitur', 'Fitur'],
    ['#harga', 'Harga'],
    ['#faq', 'FAQ'],
  ]
</script>

<header class="nav" class:scrolled>
  <div class="inner">
    <a class="wordmark" href="/" aria-label="MarryMe, kembali ke beranda">Marry<span>Me</span></a>

    <nav class="links" aria-label="Bagian halaman">
      {#each links as [href, label] (href)}
        <a {href} onclick={() => (menuOpen = false)}>{label}</a>
      {/each}
    </nav>

    {#if pricing?.promoActive && countdown.active}
      <a class="promo" href="#harga" aria-label="{pricing.promoLabel}, berakhir dalam {compact}">
        <span class="dot" aria-hidden="true"></span>
        <span class="promo-label">{pricing.promoLabel}</span>
        <span class="promo-time">⏱ {compact}</span>
      </a>
    {/if}

    <button type="button" class="lp-btn primary sm" disabled={busy} onclick={onLogin}>Masuk</button>
    <button type="button" class="burger" aria-label="Menu" aria-expanded={menuOpen} onclick={() => (menuOpen = !menuOpen)}>
      <span></span><span></span><span></span>
    </button>
  </div>
  {#if menuOpen}
    <nav class="sheet" aria-label="Bagian halaman">
      {#each links as [href, label] (href)}
        <a {href} onclick={() => (menuOpen = false)}>{label}</a>
      {/each}
    </nav>
  {/if}
</header>

<style>
  .nav {
    position: sticky;
    top: 0;
    z-index: 40;
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    background: rgba(253, 248, 244, 0.72);
    border-bottom: 1px solid transparent;
    transition: border-color 0.2s, background 0.2s;
  }
  .nav.scrolled {
    background: rgba(253, 248, 244, 0.92);
    border-bottom-color: rgba(143, 29, 69, 0.1);
  }
  .inner {
    display: flex;
    align-items: center;
    gap: 18px;
    max-width: var(--lp-max);
    min-height: 68px;
    margin: 0 auto;
    padding: 10px 24px;
  }
  .wordmark {
    color: var(--ink);
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.6rem;
    font-weight: 600;
    letter-spacing: -0.035em;
    text-decoration: none;
  }
  .wordmark span {
    color: var(--lp-maroon);
  }
  .links {
    display: flex;
    gap: 4px;
    margin-left: 8px;
  }
  .links a {
    padding: 8px 12px;
    border-radius: 999px;
    color: var(--ink);
    font-size: 0.9rem;
    font-weight: 600;
    text-decoration: none;
  }
  .links a:hover {
    background: rgba(143, 29, 69, 0.07);
  }
  .promo {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
    padding: 7px 14px 7px 10px;
    border-radius: 999px;
    background: var(--lp-ink);
    color: #fff;
    font-size: 0.8rem;
    font-weight: 700;
    text-decoration: none;
    white-space: nowrap;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--lp-gold);
    box-shadow: 0 0 0 0 rgba(245, 185, 66, 0.6);
    animation: pulse 1.8s ease-out infinite;
  }
  .promo-time {
    color: var(--lp-gold);
    font-variant-numeric: tabular-nums;
  }
  .promo + .lp-btn {
    margin-left: 0;
  }
  .inner > .lp-btn {
    margin-left: auto;
  }
  .promo ~ .lp-btn {
    margin-left: 0;
  }
  .burger {
    display: none;
    flex-direction: column;
    gap: 4px;
    width: 38px;
    height: 38px;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(143, 29, 69, 0.15);
  }
  .burger span {
    width: 16px;
    height: 2px;
    border-radius: 2px;
    background: var(--ink);
  }
  .sheet {
    display: flex;
    flex-direction: column;
    padding: 4px 16px 14px;
    border-top: 1px solid rgba(143, 29, 69, 0.1);
  }
  .sheet a {
    padding: 12px 8px;
    color: var(--ink);
    font-weight: 600;
    text-decoration: none;
    border-bottom: 1px solid rgba(143, 29, 69, 0.06);
  }
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(245, 185, 66, 0.6);
    }
    100% {
      box-shadow: 0 0 0 8px rgba(245, 185, 66, 0);
    }
  }
  @media (max-width: 900px) {
    .links {
      display: none;
    }
    .burger {
      display: flex;
    }
    .promo-label {
      display: none;
    }
    .promo {
      margin-left: auto;
      padding: 7px 12px 7px 10px;
    }
    .inner {
      gap: 10px;
      padding: 8px 16px;
    }
    .wordmark {
      font-size: 1.4rem;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .dot {
      animation: none;
    }
  }
</style>
