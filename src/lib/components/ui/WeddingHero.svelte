<script lang="ts">
  import { onMount } from 'svelte'
  import { guestName } from '../../stores/gameState.svelte'
  import { configLoaded, weddingConfig } from '../../stores/weddingConfig.svelte'
  import { playerPos } from '../../stores/playerMovement.svelte'

  let visible = $state(true)

  const guestFirstName = $derived(firstName($guestName, 'Tamu'))
  const brideFirstName = $derived(firstName($weddingConfig.bride_name, 'Mempelai'))
  const groomFirstName = $derived(firstName($weddingConfig.groom_name, 'Mempelai'))
  const coupleTitle = $derived(`${brideFirstName} & ${groomFirstName}`)
  const receptionDate = $derived(
    $weddingConfig.resepsi_date?.trim() || 'Tanggal resepsi segera diumumkan'
  )

  function firstName(name: string | null | undefined, fallback: string) {
    return name?.trim().split(/\s+/)[0] || fallback
  }

  onMount(() => {
    let animId: number
    const checkPosition = () => {
      // Sembunyikan banner melayang jika:
      // 1. Melewati area tengah / dekat resepsionis (Z < -8)
      // 2. Masuk ke area pepohonan sisi kiri (X < -6) atau kanan (X > 6)
      const inTreeArea = playerPos.x < -6 || playerPos.x > 6
      const pastReceptionist = playerPos.z < -8
      const shouldShow = !pastReceptionist && !inTreeArea
      if (visible !== shouldShow) {
        visible = shouldShow
      }
      animId = requestAnimationFrame(checkPosition)
    }
    animId = requestAnimationFrame(checkPosition)
    return () => cancelAnimationFrame(animId)
  })
</script>

{#if $configLoaded}
  <section
    class="wedding-hero pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 text-center transition-[opacity,transform] duration-500 ease-out"
    class:opacity-0={!visible}
    class:-translate-y-6={!visible}
    aria-label={`Hai ${guestFirstName}. ${receptionDate}. ${coupleTitle}`}
    aria-live="polite"
  >
    <div class="hero-panel">
      <p class="guest-greeting">Untuk {guestFirstName}</p>
      <div class="ornament" aria-hidden="true"><span></span><i></i><span></span></div>
      <h1>{coupleTitle}</h1>
      <p class="reception-date">{receptionDate}</p>
    </div>
  </section>
{/if}

<style>
  .hero-panel {
    position: relative;
    overflow: hidden;
    border: 1px solid var(--hud-edge);
    border-radius: 1.35rem;
    background:
      radial-gradient(circle at 50% -45%, rgba(255, 255, 255, 0.95), transparent 60%),
      var(--hud-ivory);
    box-shadow: inset 0 1px 0 var(--hud-edge-soft), var(--hud-shadow);
    padding: 0.75rem 1.25rem 0.85rem;
    -webkit-backdrop-filter: blur(18px) saturate(1.08);
    backdrop-filter: blur(18px) saturate(1.08);
  }

  .hero-panel::before,
  .hero-panel::after {
    position: absolute;
    top: 0.55rem;
    color: rgba(201, 164, 94, 0.58);
    content: '·';
    font: 600 1rem/1 'Playfair Display', Georgia, serif;
  }

  .hero-panel::before { left: 0.7rem; }
  .hero-panel::after { right: 0.7rem; }

  .wedding-hero {
    top: calc(env(safe-area-inset-top) + 0.7rem);
    width: min(calc(100% - 7.5rem), 23rem);
  }

  .guest-greeting {
    overflow: hidden;
    margin: 0;
    color: var(--hud-muted);
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.16em;
    line-height: 1.1;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  h1 {
    margin: 0.1rem 0 0;
    color: var(--hud-maroon);
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(1.25rem, 5vw, 1.75rem);
    font-weight: 600;
    letter-spacing: -0.035em;
    line-height: 1.05;
    text-wrap: balance;
  }

  .reception-date {
    margin: 0.32rem 0 0;
    color: var(--hud-copy);
    font-size: 0.72rem;
    font-weight: 500;
    line-height: 1.2;
  }

  .ornament {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    margin: 0.32rem auto 0.28rem;
    width: 4.5rem;
  }

  .ornament span {
    height: 1px;
    flex: 1;
    background: linear-gradient(90deg, transparent, var(--hud-gold));
  }

  .ornament span:last-child { transform: scaleX(-1); }

  .ornament i {
    width: 0.28rem;
    height: 0.28rem;
    border: 1px solid var(--hud-gold);
    transform: rotate(45deg);
  }

  @media (min-width: 768px) {
    .wedding-hero {
      top: calc(env(safe-area-inset-top) + 1rem);
      width: min(calc(100% - 10rem), 30rem);
    }

    .hero-panel { padding: 0.9rem 1.75rem 1rem; }
    .guest-greeting { font-size: 0.72rem; }
    h1 { font-size: 2rem; }
    .reception-date { font-size: 0.8rem; }
  }

  @media (pointer: coarse) and (orientation: landscape) and (max-height: 520px) {
    .wedding-hero {
      top: calc(env(safe-area-inset-top) + 0.45rem);
      width: min(calc(100% - 9rem), 20rem);
    }

    .hero-panel {
      border-radius: 1rem;
      padding: 0.42rem 1rem 0.5rem;
    }

    .guest-greeting { font-size: 0.58rem; }
    .ornament { margin-block: 0.18rem; }
    h1 { font-size: 1.2rem; }
    .reception-date { margin-top: 0.2rem; font-size: 0.62rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .hero-panel {
      transition: none;
    }
  }
</style>
