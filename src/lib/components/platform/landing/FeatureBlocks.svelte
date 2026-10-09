<script lang="ts">
  // Blok fitur bergantian (gaya galleryou): tiap blok latar gradasi pastel beda,
  // judul besar, chip fitur, dan mockup dari screenshot asli. Fade-in saat terlihat.
  import { onMount } from 'svelte'

  let { demoUrl, onCta }: { demoUrl: string; onCta: () => void } = $props()

  type Block = {
    id: string
    tone: string
    eyebrow: string
    title: string
    desc: string
    chips: string[]
    img: string
    imgAlt: string
    frame: 'browser' | 'phone' | 'panel' | 'pair'
    img2?: string
    cta?: { label: string; href?: string; action?: boolean }
  }

  const blocks = $derived<Block[]>([
    {
      id: 'dunia-3d',
      tone: 'blush',
      eyebrow: 'Dunia 3D',
      title: 'Tamu benar-benar berjalan ke pelaminan',
      desc: 'Bukan video, bukan template geser. Tamu mengendalikan karakternya sendiri, melewati taman, lalu bertemu kalian di pelaminan dengan taburan confetti.',
      chips: ['Joystick di HP, WASD di laptop', 'Resepsionis & pemandu lokasi', 'Confetti saat tiba di pelaminan'],
      img: '/media/features/stage.webp',
      imgAlt: 'Pelaminan 3D dengan pengantin dan tamu',
      frame: 'browser',
      cta: { label: 'Coba demo 3D ↗', href: demoUrl },
    },
    {
      id: 'venue',
      tone: 'peach',
      eyebrow: 'Dua venue',
      title: 'Taman sore hari atau pantai saat matahari terbenam',
      desc: 'Satu klik di dashboard untuk mengganti venue. Isi undangan, posisi tamu, dan pelaminan tetap sama, hanya dunianya yang berubah.',
      chips: ['Venue Taman', 'Venue Pantai Sunset', 'Ganti kapan saja, data tetap'],
      img: '/media/features/sunset-pantai.webp',
      img2: '/media/designs/garden.webp',
      imgAlt: 'Venue pantai dan venue taman',
      frame: 'pair',
    },
    {
      id: 'rsvp',
      tone: 'mint',
      eyebrow: 'Buku tamu & RSVP',
      title: 'Ucapan dan konfirmasi hadir masuk sendiri',
      desc: 'Tamu menulis ucapan lewat kotak surat di dalam dunia 3D. Kalian melihat siapa yang hadir, ragu, atau berhalangan, lengkap dengan statistiknya di dashboard.',
      chips: ['Hadir / Ragu / Tidak hadir', 'Statistik otomatis', 'Hapus ucapan tak pantas'],
      img: '/media/features/guestbook.webp',
      imgAlt: 'Dashboard buku tamu dengan daftar ucapan dan statistik RSVP',
      frame: 'panel',
    },
    {
      id: 'kirim',
      tone: 'lavender',
      eyebrow: 'Kirim undangan',
      title: 'Sebar lewat WhatsApp dengan nama tamu di pesannya',
      desc: 'Simpan daftar penerima, lalu kirim satu per satu lewat WhatsApp dengan pesan yang sudah dipersonalisasi. Ada juga QR code untuk undangan cetak.',
      chips: ['Daftar penerima', 'Template pesan WhatsApp', 'QR code undangan'],
      img: '/media/features/sender.webp',
      imgAlt: 'Dashboard kirim undangan via WhatsApp',
      frame: 'panel',
    },
    {
      id: 'ringan',
      tone: 'sky',
      eyebrow: 'Semua HP bisa',
      title: 'Ringan di HP tamu, tanpa install apa pun',
      desc: 'Dunia 3D dioptimalkan agar lancar di HP kelas menengah. Untuk tamu dengan HP lama, ada versi 2D pixel yang super ringan. Semua lewat link biasa di browser.',
      chips: ['Mode hemat otomatis', 'Versi 2D pixel', 'Tidak perlu aplikasi'],
      img: '/media/features/mobile-3d.webp',
      imgAlt: 'Undangan 3D di layar HP',
      frame: 'phone',
      cta: { label: 'Buat undangan sekarang', action: true },
    },
  ])

  let root = $state<HTMLElement | null>(null)
  onMount(() => {
    if (!root) return
    const items = root.querySelectorAll<HTMLElement>('.block')
    // Tanpa IntersectionObserver (browser lama): tampilkan semua, jangan sembunyikan konten.
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
      { rootMargin: '0px 0px -12% 0px', threshold: 0.15 },
    )
    items.forEach((el) => io.observe(el))
    return () => io.disconnect()
  })
</script>

<section class="features lp-section" id="fitur" aria-labelledby="features-title" bind:this={root}>
  <div class="lp-container">
    <div class="lp-section-head">
      <p class="lp-eyebrow">Fitur</p>
      <h2 id="features-title">Semua yang tamu dan kalian butuhkan, dalam satu link</h2>
    </div>

    <div class="list">
      {#each blocks as b, i (b.id)}
        <article class="block tone-{b.tone}" class:reverse={i % 2 === 1}>
          <div class="text">
            <p class="lp-eyebrow">{b.eyebrow}</p>
            <h3>{b.title}</h3>
            <p class="desc">{b.desc}</p>
            <ul class="chips">
              {#each b.chips as chip (chip)}<li>{chip}</li>{/each}
            </ul>
            {#if b.cta?.href}
              <a class="link" href={b.cta.href} target="_blank" rel="noreferrer">{b.cta.label}</a>
            {:else if b.cta?.action}
              <button type="button" class="link" onclick={onCta}>{b.cta.label} →</button>
            {/if}
          </div>

          <div class="media">
            {#if b.frame === 'browser'}
              <figure class="browser">
                <div class="chrome"><span></span><span></span><span></span></div>
                <img src={b.img} alt={b.imgAlt} loading="lazy" decoding="async" />
              </figure>
            {:else if b.frame === 'phone'}
              <figure class="phone">
                <span class="notch"></span>
                <img src={b.img} alt={b.imgAlt} loading="lazy" decoding="async" />
              </figure>
            {:else if b.frame === 'pair'}
              <figure class="pair">
                <img class="back" src={b.img2} alt="" loading="lazy" decoding="async" />
                <img class="front" src={b.img} alt={b.imgAlt} loading="lazy" decoding="async" />
                <span class="pair-label a">🌳 Taman</span>
                <span class="pair-label b">🌅 Pantai</span>
              </figure>
            {:else}
              <figure class="panel">
                <img src={b.img} alt={b.imgAlt} loading="lazy" decoding="async" />
              </figure>
            {/if}
          </div>
        </article>
      {/each}
    </div>
  </div>
</section>

<style>
  .list {
    display: flex;
    flex-direction: column;
    gap: 22px;
  }
  .block {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    align-items: center;
    gap: clamp(24px, 4vw, 56px);
    padding: clamp(28px, 4vw, 52px);
    border-radius: 30px;
    opacity: 0;
    transform: translateY(18px);
    transition: opacity 0.6s ease, transform 0.6s ease;
  }
  .block.in {
    opacity: 1;
    transform: none;
  }
  .block.reverse .text {
    order: 2;
  }
  .tone-blush {
    background: linear-gradient(135deg, #fdf0f3, #fbe3e9);
  }
  .tone-peach {
    background: linear-gradient(135deg, #fff1e6, #fde0cc);
  }
  .tone-mint {
    background: linear-gradient(135deg, #eaf7ef, #d9f0e2);
  }
  .tone-lavender {
    background: linear-gradient(135deg, #f1edfb, #e4dcf7);
  }
  .tone-sky {
    background: linear-gradient(135deg, #eaf2fc, #d9e7f8);
  }
  h3 {
    margin: 0;
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(1.6rem, 2.6vw, 2.3rem);
    font-weight: 600;
    letter-spacing: -0.03em;
    line-height: 1.12;
    color: var(--lp-ink);
    text-wrap: balance;
  }
  .desc {
    margin: 14px 0 0;
    color: var(--ink);
    opacity: 0.78;
    line-height: 1.7;
    max-width: 46ch;
  }
  .chips {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 18px 0 0;
    padding: 0;
    list-style: none;
  }
  .chips li {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    align-self: flex-start;
    padding: 8px 14px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.8);
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--lp-ink);
  }
  .chips li::before {
    content: '✓';
    color: var(--lp-maroon);
    font-weight: 800;
  }
  .link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 20px;
    padding: 0;
    background: none;
    color: var(--lp-maroon);
    font: 700 0.95rem/1 'Outfit', sans-serif;
    text-decoration: none;
    cursor: pointer;
  }
  .link:hover {
    text-decoration: underline;
  }
  .media {
    min-width: 0;
  }
  figure {
    margin: 0;
  }
  .browser,
  .panel {
    overflow: hidden;
    border-radius: 18px;
    background: #fff;
    box-shadow: 0 30px 60px -32px rgba(60, 30, 40, 0.5);
    border: 1px solid rgba(0, 0, 0, 0.06);
  }
  .chrome {
    display: flex;
    gap: 6px;
    padding: 10px 12px;
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
  .browser img,
  .panel img {
    display: block;
    width: 100%;
    height: auto;
  }
  .panel img {
    aspect-ratio: 1072 / 760;
    object-fit: cover;
    object-position: top;
  }
  .phone {
    position: relative;
    width: min(300px, 78%);
    margin: 0 auto;
    overflow: hidden;
    border-radius: 34px;
    border: 7px solid #1d1618;
    background: #1d1618;
    box-shadow: 0 30px 60px -28px rgba(0, 0, 0, 0.55);
  }
  .phone .notch {
    position: absolute;
    top: 8px;
    left: 50%;
    width: 36%;
    height: 16px;
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
    border-radius: 26px;
  }
  .pair {
    position: relative;
    aspect-ratio: 16 / 11;
  }
  .pair img {
    position: absolute;
    width: 72%;
    aspect-ratio: 16 / 10;
    object-fit: cover;
    border-radius: 16px;
    box-shadow: 0 26px 50px -28px rgba(60, 30, 40, 0.55);
    border: 3px solid #fff;
  }
  .pair .back {
    top: 0;
    left: 0;
  }
  .pair .front {
    right: 0;
    bottom: 0;
  }
  .pair-label {
    position: absolute;
    padding: 6px 12px;
    border-radius: 999px;
    background: #fff;
    font-size: 0.8rem;
    font-weight: 700;
    box-shadow: 0 10px 24px -14px rgba(0, 0, 0, 0.4);
  }
  .pair-label.a {
    top: 10px;
    left: 10px;
  }
  .pair-label.b {
    right: 10px;
    bottom: 10px;
  }
  @media (max-width: 860px) {
    .block {
      grid-template-columns: minmax(0, 1fr);
      padding: 24px 20px;
      border-radius: 24px;
    }
    .block.reverse .text {
      order: 0;
    }
    .media {
      order: 1;
    }
    .pair {
      aspect-ratio: 16 / 12;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .block {
      opacity: 1;
      transform: none;
      transition: none;
    }
  }
</style>
