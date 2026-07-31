<script lang="ts">
  import { onMount } from 'svelte'

  const DEMO_URL =
    (import.meta.env.VITE_DEMO_INVITATION_URL as string | undefined) ||
    'https://kia-toni.marryme.web.id'

  const snapshots = [
    { src: '/documentation/example1.png', alt: 'Cuplikan gerbang undangan 3D' },
    { src: '/documentation/example2.png', alt: 'Cuplikan taman undangan 3D' },
    { src: '/documentation/example3.png', alt: 'Cuplikan panggung resepsi 3D' },
    { src: '/documentation/example4.png', alt: 'Cuplikan detail dekor undangan' },
    { src: '/documentation/example5.png', alt: 'Cuplikan area tamu undangan' },
    { src: '/documentation/example6.png', alt: 'Cuplikan suasana sore undangan' },
  ]

  onMount(() => document.getElementById('startup-shell')?.remove())
</script>

<svelte:head>
  <title>MarryMe | Undangan pernikahan 3D</title>
  <meta
    name="description"
    content="Buat undangan yang terasa seperti dunia kalian sendiri. Tamu berjalan di dunia virtual, melihat galeri, dan mengisi buku tamu secara interaktif."
  />
</svelte:head>

<main class="landing">
  <div class="botanical botanical-left" aria-hidden="true"></div>
  <div class="botanical botanical-right" aria-hidden="true"></div>
  <div class="blob blob-blush" aria-hidden="true"></div>
  <div class="blob blob-gold" aria-hidden="true"></div>

  <a class="skip" href="#konten">Lewati ke konten</a>

  <header class="topbar">
    <a class="wordmark" href="/" aria-label="MarryMe">Marry<span>Me</span></a>
    <div class="topbar-right">
      <a class="text-btn" href="/dashboard">Masuk</a>
      <a class="primary-btn" href="/dashboard">Buat undangan</a>
    </div>
  </header>

  <!-- Hero: dashboard onboarding look as main face -->
  <section id="konten" class="hero" aria-labelledby="hero-title">
    <div class="hero-copy">
      <p class="eyebrow">Mulai perjalanan kalian</p>
      <h1 id="hero-title">Buat undangan yang terasa seperti <em>dunia kalian sendiri.</em></h1>
      <p class="lead">
        Dalam beberapa langkah, kalian bisa membuat undangan 3D yang berisi cerita, galeri, detail
        acara, lokasi, dan buku tamu.
      </p>
      <div class="hero-actions">
        <a class="primary-btn large" href="/dashboard">Buat undangan gratis</a>
        <a class="ghost-btn large" href={DEMO_URL} target="_blank" rel="noreferrer">Lihat demo</a>
      </div>
      <p class="hero-note">Demo publik · kia-toni.marryme.web.id</p>
    </div>

    <aside class="hero-aside" aria-label="Cuplikan undangan">
      <figure class="preview">
        <div class="preview-window">
          <img
            src="/documentation/example_widescreen.png"
            alt="Contoh dunia undangan pernikahan 3D MarryMe"
            width="1600"
            height="900"
            decoding="async"
          />
          <div class="preview-shine" aria-hidden="true"></div>
          <span class="live-badge">Live preview · 3D world</span>
        </div>
        <figcaption><span aria-hidden="true"></span> Contoh dunia undangan MarryMe</figcaption>
      </figure>
    </aside>
  </section>

  <!-- LIVE PREVIEW 3D WORLD + gallery -->
  <section class="preview-section" id="preview" aria-labelledby="preview-title">
    <div class="section-inner">
      <div class="section-head">
        <div>
          <p class="eyebrow deep">Live preview 3D world</p>
          <h2 id="preview-title">Dunia yang sudah hidup</h2>
          <p class="section-lead">
            Lihat cuplikan undangan web dan mobile. Satu link, tamu bisa masuk dari HP maupun desktop.
          </p>
        </div>
        <a class="demo-link" href={DEMO_URL} target="_blank" rel="noreferrer">
          Lihat demo <span aria-hidden="true">→</span>
        </a>
      </div>

      <div class="device-stage">
        <figure class="browser-frame">
          <div class="browser-chrome" aria-hidden="true">
            <span></span><span></span><span></span>
            <div class="browser-url">kia-toni.marryme.web.id</div>
          </div>
          <img
            src="/documentation/example_widescreen.png"
            alt="Preview undangan 3D di desktop"
            class="browser-shot"
            loading="lazy"
            decoding="async"
          />
        </figure>

        <!-- Tambahan Tombol Lihat Demo di Ruang Kosong -->
        <div class="demo-cta-wrapper sm:flex hidden">
          <a class="demo-cta-button" href={DEMO_URL} target="_blank" rel="noreferrer">
            Lihat Demo <span class="arrow">→</span>
          </a>
          <span class="demo-cta-note">Demo publik tersedia gratis</span>
        </div>

        <figure class="phone-frame">
          <div class="phone-notch" aria-hidden="true"></div>
          <img
            src="/documentation/example1.png"
            alt="Preview undangan 3D di ponsel"
            class="phone-shot"
            loading="lazy"
            decoding="async"
          />
        </figure>
      </div>

      <div class="snap-grid" role="list">
        {#each snapshots as shot}
          <figure class="snap" role="listitem">
            <img src={shot.src} alt={shot.alt} loading="lazy" decoding="async" />
          </figure>
        {/each}
      </div>

      <div class="preview-cta">
        <a class="primary-btn large" href={DEMO_URL} target="_blank" rel="noreferrer">Lihat demo</a>
        <a class="ghost-btn large" href="/dashboard">Buat undangan gratis</a>
      </div>
    </div>
  </section>

  <!-- Mengapa undangan 3D -->
  <section class="why-section" aria-labelledby="why-title">
    <div class="section-inner">
      <div class="section-head center">
        <p class="eyebrow deep">Mengapa undangan 3D?</p>
        <h2 id="why-title">Lebih dari sekadar tautan cantik</h2>
        <p class="section-lead">
          MarryMe mengubah undangan menjadi ruang yang bisa dijelajahi — intimate, modern, dan mudah
          dibagikan.
        </p>
      </div>

      <div class="why-grid">
        <article class="why-card">
          <h3>Unik &amp; berkesan</h3>
          <p>Bukan template flat. Tamu mengingat undangan kalian sebagai petualangan kecil di dunia 3D.</p>
        </article>
        <article class="why-card">
          <h3>Sangat interaktif</h3>
          <p>
            Jalan-jalan virtual, buka galeri, cek lokasi acara, dan tulis ucapan di buku tamu dalam
            satu scene.
          </p>
        </article>
        <article class="why-card">
          <h3>HP &amp; desktop</h3>
          <p>
            Kontrol sentuh di ponsel, keyboard di desktop. Satu link, semua tamu bisa masuk dengan
            nyaman.
          </p>
        </article>
      </div>
    </div>
  </section>

  <!-- Langkah mudah -->
  <section class="steps-section" aria-labelledby="steps-title">
    <div class="section-inner">
      <div class="section-head center">
        <p class="eyebrow deep">Langkah mudah</p>
        <h2 id="steps-title">Dari ide ke link yang dibagikan</h2>
      </div>

      <ol class="steps-grid">
        <li class="step-card">
          <span class="step-num" aria-hidden="true">01</span>
          <h3>Pilih tema</h3>
          <p>Mulai dari dunia 3D yang sudah disiapkan. Suasana warm summer afternoon siap dibagikan.</p>
        </li>
        <li class="step-card">
          <span class="step-num" aria-hidden="true">02</span>
          <h3>Kustomisasi dunia 3D</h3>
          <p>
            Isi detail pasangan, acara, dan pesan. Pilih subdomain yang mudah diingat di
            marryme.web.id.
          </p>
        </li>
        <li class="step-card">
          <span class="step-num" aria-hidden="true">03</span>
          <h3>Sebarkan link</h3>
          <p>Setelah aktif, bagikan tautan publik. Tamu langsung masuk ke dunia undangan kalian.</p>
        </li>
      </ol>

      <div class="closing">
        <h2>Siap membuat undangan yang dikenang?</h2>
        <p>Mulai gratis, atau coba dulu demo publik untuk merasakan dunia 3D-nya.</p>
        <div class="hero-actions center">
          <a class="primary-btn large" href="/dashboard">Buat undangan gratis</a>
          <a class="ghost-btn large" href={DEMO_URL} target="_blank" rel="noreferrer">Lihat demo</a>
        </div>
      </div>
    </div>
  </section>

  <footer class="site-footer">
    <div class="footer-inner">
      <p><span>MarryMe</span> by Jago Institute</p>
      <p class="footer-year">2026</p>
    </div>
  </footer>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow-x: hidden;
  }
  
  .landing {
    --paper: #fdf8f4;
    --surface: #fffdfb;
    --ink: #292321;
    --muted: #706662;
    --line: #eadbd6;
    --accent: #9e204c;
    --accent-deep: #8f1d45;
    --gold: #a97625;
    --blush: #f6e8ea;
    position: relative;
    isolation: isolate;
    min-height: 100vh; display: flex; flex-direction: column; overflow-y: auto;
    overflow-x: clip;
    background:
      radial-gradient(circle at 76% 12%, rgba(246, 232, 234, 0.7), transparent 30rem),
      linear-gradient(135deg, var(--paper), #fffaf7 52%, #fbf1ef);
    color: var(--ink);
    font-family: 'Outfit', 'Segoe UI', system-ui, -apple-system, sans-serif;
  }

  .landing::before {
    position: fixed;
    inset: 0;
    z-index: -3;
    background-image: radial-gradient(rgba(143, 29, 69, 0.04) 0.7px, transparent 0.7px);
    background-size: 8px 8px;
    content: '';
  }

  .blob {
    position: absolute;
    z-index: -2;
    border-radius: 50%;
    filter: blur(15px);
    pointer-events: none;
  }
  .blob-blush {
    top: 12%;
    left: -10rem;
    width: 28rem;
    height: 28rem;
    background: rgba(246, 216, 222, 0.44);
  }
  .blob-gold {
    right: -8rem;
    top: 38%;
    width: 23rem;
    height: 23rem;
    background: rgba(184, 134, 45, 0.12);
  }

  .botanical {
    position: absolute;
    z-index: -1;
    width: 18rem;
    height: 27rem;
    opacity: 0.14;
    pointer-events: none;
    background:
      radial-gradient(ellipse at 48% 20%, transparent 27%, var(--gold) 28% 29%, transparent 30%),
      radial-gradient(ellipse at 26% 34%, transparent 25%, var(--gold) 26% 27%, transparent 28%),
      radial-gradient(ellipse at 68% 47%, transparent 26%, var(--gold) 27% 28%, transparent 29%),
      linear-gradient(74deg, transparent 49.5%, var(--gold) 50% 50.6%, transparent 51%);
  }
  .botanical-left {
    left: -7rem;
    top: 48%;
    transform: rotate(-24deg);
  }
  .botanical-right {
    top: 6rem;
    right: -8rem;
    transform: rotate(150deg);
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  .skip {
    position: absolute;
    left: -9999px;
    top: 1rem;
    z-index: 50;
    border-radius: 999px;
    background: var(--ink);
    color: white;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }
  .skip:focus {
    left: 1rem;
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    max-width: 1120px;
    min-height: 78px;
    margin: 0 auto;
    padding: 12px 24px;
  }
  .topbar-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .wordmark {
    color: var(--ink);
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.72rem;
    font-weight: 600;
    letter-spacing: -0.035em;
  }
  .wordmark span {
    color: var(--accent-deep);
  }

  .text-btn {
    display: none;
    padding: 10px 14px;
    border-radius: 999px;
    color: var(--muted);
    font-size: 0.875rem;
    font-weight: 600;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .text-btn:hover {
    background: rgba(196, 69, 101, 0.08);
    color: var(--accent-deep);
  }
  @media (min-width: 640px) {
    .text-btn {
      display: inline-flex;
    }
  }

  .primary-btn,
  .ghost-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    border-radius: 999px;
    padding: 10px 16px;
    font: 650 0.875rem/1 'Outfit', sans-serif;
    transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  }
  .primary-btn {
    background: var(--accent-deep);
    color: #fff;
    box-shadow: 0 14px 32px -16px rgba(143, 29, 69, 0.72);
  }
  .primary-btn:hover {
    background: #761638;
    transform: translateY(-1px);
  }
  .primary-btn:active {
    transform: scale(0.98);
  }
  .ghost-btn {
    border: 1px solid var(--line);
    background: rgba(255, 253, 251, 0.78);
    color: var(--ink);
  }
  .ghost-btn:hover {
    border-color: rgba(143, 29, 69, 0.35);
    background: #fff;
    transform: translateY(-1px);
  }
  .primary-btn.large,
  .ghost-btn.large {
    min-height: 52px;
    padding: 14px 22px;
    font-size: 0.9375rem;
  }

  a:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }

  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
    align-items: center;
    gap: clamp(32px, 6vw, 72px);
    max-width: 1120px;
    margin: 0 auto;
    padding: clamp(36px, 6vw, 64px) 24px clamp(56px, 8vw, 88px);
  }

  .eyebrow {
    margin: 0 0 12px;
    color: var(--gold);
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }
  .eyebrow.deep {
    color: var(--accent-deep);
  }

  h1 {
    margin: 0;
    max-width: 13ch;
    color: var(--accent-deep);
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(2.85rem, 5.6vw, 5.1rem);
    font-weight: 500;
    letter-spacing: -0.052em;
    line-height: 0.96;
    overflow-wrap: anywhere;
    text-wrap: balance;
  }
  h1 em {
    color: var(--gold);
    font-style: italic;
    font-weight: inherit;
  }

  .lead,
  .section-lead {
    max-width: 52ch;
    margin: 22px 0 0;
    color: var(--muted);
    font-size: clamp(1rem, 1.4vw, 1.12rem);
    line-height: 1.72;
    text-wrap: pretty;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 28px;
  }
  .hero-actions.center {
    justify-content: center;
  }
  .hero-note {
    margin: 14px 0 0;
    color: #9b8990;
    font-size: 0.75rem;
  }

  .preview {
    margin: 0;
  }
  .preview-window {
    position: relative;
    overflow: hidden;
    aspect-ratio: 16 / 10;
    border: 1px solid rgba(255, 255, 255, 0.82);
    border-radius: 18px;
    background: var(--blush);
    box-shadow: 0 30px 70px -36px rgba(80, 44, 53, 0.5);
  }
  .preview-window img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 40%;
  }
  .preview-shine {
    position: absolute;
    inset: 0;
    background: linear-gradient(130deg, rgba(255, 255, 255, 0.18), transparent 42%, rgba(143, 29, 69, 0.08));
  }
  .live-badge {
    position: absolute;
    bottom: 12px;
    left: 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.42);
    color: rgba(255, 255, 255, 0.92);
    padding: 6px 12px;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    backdrop-filter: blur(8px);
  }
  .preview figcaption {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-top: 11px;
    color: var(--muted);
    font-size: 0.76rem;
    letter-spacing: 0.03em;
  }
  .preview figcaption span {
    width: 18px;
    height: 1px;
    background: var(--gold);
  }

  .preview-section {
    background: rgba(255, 255, 255, 0.88);
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
  }

  .section-inner {
    max-width: 1120px;
    margin: 0 auto;
    padding: clamp(56px, 8vw, 96px) 24px;
  }

  .section-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 36px;
  }
  .section-head.center {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .section-head.center .section-lead {
    margin-left: auto;
    margin-right: auto;
  }

  h2 {
    margin: 8px 0 0;
    color: var(--ink);
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(1.85rem, 3.4vw, 2.75rem);
    font-weight: 600;
    letter-spacing: -0.03em;
    line-height: 1.1;
    text-wrap: balance;
  }

  .demo-link {
    flex: none;
    color: var(--accent-deep);
    font-size: 0.9rem;
    font-weight: 700;
    white-space: nowrap;
    transition: color 0.15s ease;
  }
  .demo-link:hover {
    color: var(--gold);
  }
  .demo-link span {
    margin-left: 4px;
  }

  .device-stage {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
    margin-bottom: 28px;
  }

  .browser-frame {
    margin: 0;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 18px;
    background: #241b20;
    box-shadow: 0 36px 70px -34px rgba(83, 38, 54, 0.42);
  }
  .browser-chrome {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: #2a1f24;
  }
  .browser-chrome span {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #e8a0a0;
  }
  .browser-chrome span:nth-child(2) {
    background: #e8d4a0;
  }
  .browser-chrome span:nth-child(3) {
    background: #a8d4b0;
  }
  .browser-url {
    margin-left: 8px;
    min-width: 0;
    flex: 1;
    overflow: hidden;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.28);
    color: #d4c8be;
    padding: 6px 10px;
    font-size: 0.7rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .browser-shot {
    display: block;
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    object-position: center 38%;
  }

  .phone-frame {
    position: relative;
    width: min(180px, 34%);
    margin: -4.5rem 1.25rem 0 auto;
    overflow: hidden;
    border: 3px solid var(--ink);
    border-radius: 1.35rem;
    background: var(--ink);
    box-shadow: 0 28px 50px -20px rgba(83, 38, 54, 0.55);
  }
  .phone-notch {
    width: 36%;
    height: 5px;
    margin: 8px auto 0;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.22);
  }
  .phone-shot {
    display: block;
    width: 100%;
    aspect-ratio: 9 / 16;
    object-fit: cover;
  }

  .snap-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
  .snap {
    margin: 0;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: white;
    box-shadow: 0 18px 40px -30px rgba(83, 38, 54, 0.35);
  }
  .snap img {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    transition: transform 0.45s ease;
  }
  .snap:hover img {
    transform: scale(1.04);
  }

  .preview-cta {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
    margin-top: 36px;
  }

  .why-section {
    background: transparent;
  }
  .why-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }
  .why-card {
    padding: 28px 24px;
    border: 1px solid rgba(255, 255, 255, 0.85);
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.78);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.9),
      0 24px 50px -36px rgba(83, 38, 54, 0.35);
    backdrop-filter: blur(16px);
    transition: transform 0.2s ease, border-color 0.2s ease;
  }
  .why-card:hover {
    border-color: rgba(143, 29, 69, 0.28);
    transform: translateY(-3px);
  }
  .why-card h3 {
    margin: 0;
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.35rem;
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  .why-card p {
    margin: 10px 0 0;
    color: var(--muted);
    font-size: 0.92rem;
    line-height: 1.65;
  }

  .steps-section {
    border-top: 1px solid var(--line);
  }
  .steps-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .step-card {
    padding: 28px 24px;
    border: 1px solid var(--line);
    border-radius: 20px;
    background: rgba(255, 253, 251, 0.82);
    transition: border-color 0.2s ease, background 0.2s ease;
  }
  .step-card:hover {
    border-color: rgba(143, 29, 69, 0.28);
    background: #fff;
  }
  .step-num {
    display: block;
    color: #f1dce3;
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 2.75rem;
    font-weight: 600;
    line-height: 1;
    transition: color 0.2s ease;
  }
  .step-card:hover .step-num {
    color: var(--accent);
  }
  .step-card h3 {
    margin: 14px 0 0;
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.3rem;
    font-weight: 600;
  }
  .step-card p {
    margin: 10px 0 0;
    color: var(--muted);
    font-size: 0.92rem;
    line-height: 1.65;
  }

  .closing {
    margin-top: 64px;
    padding: clamp(36px, 5vw, 52px);
    border: 1px solid rgba(219, 197, 190, 0.72);
    border-radius: 24px;
    background:
      radial-gradient(circle at 20% 0%, rgba(255, 255, 255, 0.85), transparent 40%),
      linear-gradient(135deg, #fff8fa, #fce8ee 55%, #f8dce5);
    text-align: center;
    box-shadow: 0 30px 60px -40px rgba(83, 38, 54, 0.4);
  }
  .closing h2 {
    color: var(--accent-deep);
  }
  .closing p {
    max-width: 42ch;
    margin: 14px auto 0;
    color: var(--ink);
    font-size: 1rem;
    line-height: 1.65;
  }

  .site-footer {
    max-width: 1120px;
    margin: 0 auto;
    padding: 1rem 24px 1.5rem; margin-top: auto;
  }
  .footer-inner {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 20px;
    padding-top: 22px;
    border-top: 1px solid rgba(169, 118, 37, 0.24);
    color: var(--muted);
    font-size: 0.78rem;
    letter-spacing: 0.035em;
  }
  .footer-inner p {
    margin: 0;
  }
  .footer-inner span {
    color: var(--accent-deep);
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  .footer-year {
    color: var(--gold);
    font-variant-numeric: tabular-nums;
    font-weight: 650;
    letter-spacing: 0.14em;
  }

  @media (max-width: 900px) {
    .hero {
      grid-template-columns: 1fr;
      padding-top: 28px;
    }
    h1 {
      max-width: 16ch;
    }
    .section-head:not(.center) {
      flex-direction: column;
      align-items: flex-start;
    }
    .why-grid,
    .steps-grid {
      grid-template-columns: 1fr;
    }
    .snap-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 560px) {
    .topbar {
      padding-inline: 16px;
    }
    .wordmark {
      font-size: 1.48rem;
    }
    .hero,
    .section-inner,
    .site-footer {
      padding-inline: 18px;
    }
    h1 {
      font-size: clamp(2.55rem, 12vw, 3.6rem);
    }
    .phone-frame {
      width: min(140px, 38%);
      margin-top: -3.5rem;
      margin-right: 0.75rem;
    }
    .snap-grid {
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .closing {
      padding: 28px 20px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .primary-btn,
    .ghost-btn,
    .why-card,
    .snap img {
      transition: none;
    }
    .primary-btn:active,
    .ghost-btn:hover,
    .why-card:hover {
      transform: none;
    }
  }

  /* Tambahan Style Tombol Lihat Demo di Ruang Kosong */
  .demo-cta-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem;
    border: 1px dashed rgba(143, 29, 69, 0.2);
    border-radius: 1rem;
    background: rgba(253, 248, 244, 0.6);
    grid-column: span 1;
    align-self: center;
    justify-self: center;
  }
  .demo-cta-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background-color: transparent;
    color: #8f1d45;
    border: 1px solid #8f1d45;
    padding: 0.75rem 1.5rem;
    border-radius: 9999px;
    font-weight: 500;
    font-size: 0.95rem;
    transition: all 200ms ease;
    text-decoration: none;
    cursor: pointer;
  }
  .demo-cta-button:hover {
    background-color: #8f1d45;
    color: #ffffff;
  }
  .demo-cta-button .arrow {
    transition: transform 200ms ease;
  }
  .demo-cta-button:hover .arrow {
    transform: translateX(4px);
  }
  .demo-cta-note {
    font-size: 0.75rem;
    color: #706662;
    text-align: center;
  }
</style>

