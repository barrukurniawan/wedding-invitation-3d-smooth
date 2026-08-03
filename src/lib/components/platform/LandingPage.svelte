<script lang="ts">
  import { onMount } from 'svelte'
  import './landing.css'
  import {
    getUserSession,
    startGoogleLogin,
    type UserAccount,
  } from '$lib/api-client'

  let loading = $state(true)
  let busy = $state(false)
  let user = $state<UserAccount | null>(null)
  let error = $state('')

  const DEMO_URL =
    (import.meta.env.VITE_DEMO_INVITATION_URL as string | undefined) ||
    'https://kia-toni.marryme.web.id'

  onMount(() => {
    document.getElementById('startup-shell')?.remove()
    const params = new URLSearchParams(window.location.search)
    const authError = params.get('authError')
    if (authError) {
      error = authErrorMessage(authError)
      params.delete('authError')
      const clean = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`
      window.history.replaceState({}, '', clean)
    }
    void bootstrap()
  })

  function authErrorMessage(code: string) {
    if (code === 'OAUTH_NOT_CONFIGURED') return 'Layanan masuk Google belum tersedia.'
    if (code === 'OAUTH_DENIED') return 'Proses masuk Google dibatalkan.'
    if (code === 'USER_SUSPENDED') return 'Akun ini belum dapat digunakan.'
    return 'Login Google belum berhasil.'
  }

  function handleGoogleLogin() {
    if (busy) return
    busy = true
    error = ''
    requestAnimationFrame(() => {
      try {
        startGoogleLogin('/account')
      } catch {
        busy = false
        error = 'Login Google belum berhasil.'
      }
    })
  }

  async function bootstrap() {
    loading = true
    try {
      const session = await getUserSession()
      user = session.user
      if (user) {
        window.location.href = '/account'
        return
      }
    } catch {
      user = null
    } finally {
      loading = false
    }
  }
</script>

<svelte:head>
  <title>Mulai undangan kalian | MarryMe</title>
  <meta name="description" content="Mulai membuat undangan pernikahan 3D kalian bersama MarryMe." />
</svelte:head>

<main class="onboarding">
  <div class="botanical botanical-left" aria-hidden="true"></div>
  <div class="botanical botanical-right" aria-hidden="true"></div>
  <div class="blob blob-blush" aria-hidden="true"></div>
  <div class="blob blob-gold" aria-hidden="true"></div>

  <!-- Topbar Header -->
  <header class="topbar">
    <a class="wordmark" href="/" aria-label="MarryMe, kembali ke beranda">Marry<span>Me</span></a>
    <div class="topbar-right">
      {#if user}
        <a href="/account" class="primary-btn">Dashboard Saya →</a>
      {:else}
        <button type="button" class="ghost logout-btn" disabled={busy} onclick={handleGoogleLogin}>Masuk</button>
      {/if}
    </div>
  </header>

  <!-- Logged Out Onboarding Section -->
  <section class="journey" aria-labelledby="journey-title">
    <div class="story-column">
      <p class="eyebrow">Mulai perjalanan kalian</p>
      <h1 id="journey-title"><span class="title-lead">Buat undangan yang terasa seperti</span> <em>dunia kalian sendiri.</em></h1>
      <p class="lead">
        Dalam beberapa langkah, kalian bisa membuat undangan 3D yang berisi cerita, galeri, detail acara,
        lokasi, dan buku tamu.
      </p>

      <figure class="preview">
        <div class="preview-window">
          <video
            src="/media/preview.mp4"
            poster="/media/preview-poster.jpg"
            aria-label="Contoh dunia undangan pernikahan 3D MarryMe"
            autoplay
            loop
            muted
            playsinline
          ></video>
          <div class="preview-shine" aria-hidden="true"></div>
        </div>
        <figcaption><span aria-hidden="true"></span> Contoh dunia undangan MarryMe</figcaption>
      </figure>

      <nav class="stepper" aria-label="Empat langkah membuat undangan">
        <ol>
          <li class="active" aria-current="step">
            <span class="step-number">01</span>
            <span><strong>Masuk</strong><small>Simpan progres undangan</small></span>
          </li>
          <li>
            <span class="step-number">02</span>
            <span><strong>Pilih link</strong><small>Tentukan alamat yang mudah diingat</small></span>
          </li>
          <li>
            <span class="step-number">03</span>
            <span><strong>Isi cerita</strong><small>Tambahkan detail pernikahan kalian</small></span>
          </li>
          <li>
            <span class="step-number">04</span>
            <span><strong>Bagikan</strong><small>Undang tamu ke dunia 3D kalian</small></span>
          </li>
        </ol>
      </nav>
    </div>

    <aside class="login-card" aria-labelledby="login-title">
      {#if loading}
        <div class="login-skeleton" aria-busy="true" aria-label="Memeriksa sesi akun">
          <span class="skeleton-line short"></span>
          <span class="skeleton-line heading"></span>
          <span class="skeleton-line"></span>
          <span class="skeleton-line medium"></span>
          <span class="skeleton-button"></span>
        </div>
      {:else}
        <p class="card-label">Langkah 01 dari 04</p>
        <h2 id="login-title">Mulai membuat undangan</h2>
        <p class="card-copy">Masuk dengan Google untuk menyimpan progres dan mengelola undangan kalian.</p>

        {#if error}<p class="owner-error" role="alert">{error}</p>{/if}

        <button class="google-button" type="button" disabled={busy} aria-busy={busy} onclick={handleGoogleLogin}>
          {#if busy}
            <span class="spinner" aria-hidden="true"></span>
            Menghubungkan ke Google…
          {:else}
            <svg class="google-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z"/>
              <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.6c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.7A10.1 10.1 0 0 0 12 22Z"/>
              <path fill="#FBBC05" d="M6.5 14a6 6 0 0 1 0-3.9V7.4H3.1a10 10 0 0 0 0 9.2L6.5 14Z"/>
              <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10.1 10.1 0 0 0-8.9 5.4l3.4 2.7A5.9 5.9 0 0 1 12 6Z"/>
            </svg>
            Lanjutkan dengan Google
          {/if}
        </button>
        <p class="login-note">Gratis untuk memulai <span>·</span> Tidak perlu mengingat kata sandi</p>

        <div class="rule" aria-hidden="true"><span></span><i>MarryMe</i><span></span></div>
        <ul class="reassurance">
          <li><span aria-hidden="true">✓</span> Satu akun untuk satu undangan</li>
          <li><span aria-hidden="true">✓</span> Link undangan unik milik kalian</li>
          <li><span aria-hidden="true">✓</span> Tetap privat sampai kalian siap membagikannya</li>
        </ul>
      {/if}
    </aside>
  </section>

  <section class="preview-section" id="preview" aria-labelledby="preview-title">
    <div class="section-inner">
      <div class="section-head center">
        <div>
          <p class="eyebrow-deep">Live preview 3D world</p>
          <h2 id="preview-title">Dunia yang sudah hidup</h2>
          <p class="section-lead">
            Lihat cuplikan undangan web dan mobile. Satu link, tamu bisa masuk dari HP maupun desktop.
          </p>
        </div>
      </div>

      <div class="device-stage">
        <figure class="browser-frame">
          <div class="browser-chrome" aria-hidden="true">
            <span></span><span></span><span></span>
            <div class="browser-url">kia-toni.marryme.web.id</div>
          </div>
          <video
            src="/media/preview.mp4"
            poster="/media/preview-poster.jpg"
            aria-label="Preview undangan 3D di desktop"
            class="browser-shot"
            autoplay
            loop
            muted
            playsinline
          ></video>
        </figure>

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
    </div>
  </section>

  <section class="why-section" aria-labelledby="why-title">
    <div class="section-inner">
      <div class="section-head center">
        <p class="eyebrow-deep">Mengapa undangan 3D?</p>
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

  <section class="steps-section" aria-labelledby="steps-title">
    <div class="section-inner">
      <div class="section-head center">
        <p class="eyebrow-deep">Langkah mudah</p>
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
        <div class="closing-actions">
          <button type="button" class="primary-btn large" onclick={handleGoogleLogin}>Buat undangan gratis</button>
          <a class="ghost-btn large" href={DEMO_URL} target="_blank" rel="noreferrer">Lihat demo</a>
        </div>
      </div>
    </div>
  </section>
</main>
