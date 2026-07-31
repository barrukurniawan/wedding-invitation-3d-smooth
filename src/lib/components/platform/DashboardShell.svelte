<script lang="ts">
  import { onMount } from 'svelte'
  import {
    ApiError,
    createInvitation,
    getMyInvitation,
    getUserSession,
    logoutUser,
    startGoogleLogin,
    type OwnerInvitation,
    type UserAccount,
  } from '$lib/api-client'

  let loading = $state(true)
  let busy = $state(false)
  let user = $state<UserAccount | null>(null)
  let invitation = $state<OwnerInvitation | null>(null)
  let error = $state('')
  let slugInput = $state('')
  let brideInput = $state('')
  let groomInput = $state('')
  const slugPattern = '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'
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

  function statusLabel(status: string) {
    if (status === 'active') return 'Aktif'
    if (status === 'draft') return 'Dalam persiapan'
    if (status === 'suspended') return 'Ditangguhkan'
    if (status === 'expired') return 'Berakhir'
    return status
  }

  function handleGoogleLogin() {
    if (busy) return
    busy = true
    error = ''
    requestAnimationFrame(() => {
      try {
        startGoogleLogin('/dashboard')
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
      const mine = await getMyInvitation()
      invitation = mine.invitation
      error = ''
    } catch (err) {
      user = null
      invitation = null
      if (!(err instanceof ApiError) || err.status !== 401) {
        error = 'Login Google belum berhasil.'
      }
    } finally {
      loading = false
    }
  }

  async function handleLogout() {
    busy = true
    error = ''
    try {
      await logoutUser()
      user = null
      invitation = null
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Belum dapat keluar dari akun.'
    } finally {
      busy = false
    }
  }

  async function handleCreate() {
    busy = true
    error = ''
    try {
      const result = await createInvitation({
        slug: slugInput.trim().toLowerCase(),
        bride_name: brideInput.trim() || undefined,
        groom_name: groomInput.trim() || undefined,
      })
      invitation = result.invitation
      slugInput = ''
      brideInput = ''
      groomInput = ''
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Undangan gagal dibuat.'
    } finally {
      busy = false
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

  <header class="topbar">
    <a class="wordmark" href="/" aria-label="MarryMe, kembali ke beranda">Marry<span>Me</span></a>
    <div class="topbar-right">
      {#if user}
        <span class="session-chip" title={user.email || user.displayName}>{user.displayName}</span>
        <button type="button" class="ghost" disabled={busy} onclick={() => void handleLogout()}>Keluar</button>
      {/if}
    </div>
  </header>

  {#if !user}
    <section class="journey" aria-labelledby="journey-title">
      <div class="story-column">
        <p class="eyebrow">Mulai perjalanan kalian</p>
        <h1 id="journey-title">Buat undangan yang terasa seperti <em>dunia kalian sendiri.</em></h1>
        <p class="lead">
          Dalam beberapa langkah, kalian bisa membuat undangan 3D yang berisi cerita, galeri, detail acara,
          lokasi, dan buku tamu.
        </p>

        <figure class="preview">
          <div class="preview-window">
            <img
              src="/documentation/example_widescreen.png"
              alt="Contoh dunia undangan pernikahan 3D MarryMe"
            />
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
            <img
              src="/documentation/example_widescreen.png"
              alt="Preview undangan 3D di desktop"
              class="browser-shot"
              loading="lazy"
              decoding="async"
            />
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
            <a class="primary-btn large" href="/dashboard">Buat undangan gratis</a>
            <a class="ghost-btn large" href={DEMO_URL} target="_blank" rel="noreferrer">Lihat demo</a>
          </div>
        </div>
      </div>
    </section>
  {:else}
    <section class="workspace" aria-labelledby="owner-title">
      <div class="page-head">
        <div>
          <p class="eyebrow">Ruang undangan kalian</p>
          <h1 id="owner-title">Selamat datang, {user.displayName}.</h1>
          <p class="lead">Lanjutkan menyiapkan setiap detail sebelum undangan kalian dibagikan.</p>
        </div>
      </div>

      {#if error}<p class="owner-error" role="alert">{error}</p>{/if}

      <div class="layout-split">
        <div class="panel account-panel">
          <p class="label">Akun</p>
          <h2 class="account-name">{user.displayName}</h2>
          {#if user.email}
            <p class="muted mono">{user.email}</p>
          {/if}
        </div>

        {#if invitation}
          <div class="panel invite-panel">
            <div class="invite-head">
              <div>
                <p class="label">Undangan</p>
                <h2 class="slug-title">{invitation.slug}</h2>
              </div>
              <span class="badge" data-status={invitation.status}>{statusLabel(invitation.status)}</span>
            </div>

            {#if invitation.config}
              <p class="couple">{invitation.config.bride_name} &amp; {invitation.config.groom_name}</p>
            {/if}

            <dl class="meta-grid">
              <div>
                <dt>Zona waktu</dt>
                <dd class="mono">{invitation.timezone}</dd>
              </div>
              <div>
                <dt>Resepsi</dt>
                <dd class="mono">{invitation.reception_at}</dd>
              </div>
              <div>
                <dt>Berakhir</dt>
                <dd class="mono">{invitation.expires_at}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{statusLabel(invitation.status)}</dd>
              </div>
            </dl>

            {#if invitation.status === 'active'}
              <a class="primary link large" href={invitation.public_url} target="_blank" rel="noreferrer">
                Buka undangan publik
              </a>
            {:else}
              <p class="draft-note">
                Undangan kalian masih dalam persiapan dan belum dapat dilihat tamu. Selesaikan detailnya sebelum dibagikan.
              </p>
            {/if}
          </div>
        {:else}
          <div class="panel create-panel">
            <p class="label">Buat undangan</p>
            <h2>Pilih link undangan</h2>
            <p class="muted">
              Tentukan alamat yang singkat dan mudah diingat oleh keluarga serta para tamu.
            </p>
            <form
              class="form"
              onsubmit={(event) => {
                event.preventDefault()
                void handleCreate()
              }}
            >
              <label>
                Alamat undangan
                <div class="slug-row">
                  <input
                    bind:value={slugInput}
                    maxlength="63"
                    pattern={slugPattern}
                    placeholder="nama-pasangan"
                    required
                    autocomplete="off"
                    spellcheck="false"
                  />
                  <span class="slug-suffix">.marryme.web.id</span>
                </div>
              </label>
              <div class="name-row">
                <label>
                  Nama mempelai wanita
                  <input bind:value={brideInput} maxlength="255" placeholder="Opsional" />
                </label>
                <label>
                  Nama mempelai pria
                  <input bind:value={groomInput} maxlength="255" placeholder="Opsional" />
                </label>
              </div>
              <button type="submit" class="primary large" disabled={busy || !slugInput.trim()}>
                Mulai undangan
              </button>
            </form>
          </div>
        {/if}
      </div>
    </section>
  {/if}
</main>

<style>
  .onboarding {
    --paper: #fdf8f4;
    --surface: #fffdfb;
    --ink: #292321;
    --muted: #706662;
    --line: #eadbd6;
    --accent: #9e204c;
    --accent-deep: #8f1d45;
    --gold: #a97625;
    --blush: #f6e8ea;
    --ok: #2f6b4f;
    position: relative;
    isolation: isolate;
    min-height: 100dvh;
    overflow-x: clip;
    background:
      radial-gradient(circle at 76% 15%, rgba(246, 232, 234, 0.72), transparent 30rem),
      linear-gradient(135deg, var(--paper), #fffaf7 52%, #fbf1ef);
    color: var(--ink);
    font-family: 'Outfit', 'Segoe UI', system-ui, -apple-system, sans-serif;
  }

  .onboarding::before {
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
    top: 15%;
    left: -10rem;
    width: 28rem;
    height: 28rem;
    background: rgba(246, 216, 222, 0.44);
  }
  .blob-gold {
    right: -8rem;
    bottom: 4rem;
    width: 23rem;
    height: 23rem;
    background: rgba(184, 134, 45, 0.12);
  }

  .botanical {
    position: absolute;
    z-index: -1;
    width: 18rem;
    height: 27rem;
    opacity: 0.16;
    pointer-events: none;
    background:
      radial-gradient(ellipse at 48% 20%, transparent 27%, var(--gold) 28% 29%, transparent 30%),
      radial-gradient(ellipse at 26% 34%, transparent 25%, var(--gold) 26% 27%, transparent 28%),
      radial-gradient(ellipse at 68% 47%, transparent 26%, var(--gold) 27% 28%, transparent 29%),
      linear-gradient(74deg, transparent 49.5%, var(--gold) 50% 50.6%, transparent 51%);
  }
  .botanical-left {
    left: -7rem;
    bottom: -6rem;
    transform: rotate(-24deg);
  }
  .botanical-right {
    top: 4rem;
    right: -8rem;
    transform: rotate(150deg);
  }

  a {
    color: inherit;
    text-decoration: none;
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
    gap: 16px;
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

  .session-chip {
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--muted);
    font-size: 0.8125rem;
    font-weight: 600;
  }

  .ghost {
    padding: 10px 12px;
    border: 1px solid rgba(196, 69, 101, 0.2);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.55);
    color: var(--ink);
    cursor: pointer;
    font: 650 0.8125rem/1 'Outfit', sans-serif;
    transition: background 0.15s ease;
  }
  .ghost:hover:not(:disabled) {
    background: color-mix(in srgb, var(--ink) 4%, transparent);
  }

  .journey,
  .workspace {
    max-width: 1120px;
    margin: 0 auto;
    padding: clamp(42px, 6vw, 76px) 24px 72px;
  }

  .journey {
    display: grid;
    grid-template-columns: minmax(0, 1.28fr) minmax(19rem, 0.72fr);
    align-items: start;
    gap: clamp(42px, 7vw, 84px);
  }

  .story-column {
    min-width: 0;
  }

  .eyebrow,
  .card-label {
    margin: 0 0 12px;
    color: var(--gold);
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .label {
    margin: 0 0 8px;
    color: var(--gold);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    max-width: 13ch;
    color: var(--accent-deep);
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(3.15rem, 5.7vw, 5.35rem);
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

  h2 {
    margin: 8px 0 0;
    color: var(--ink);
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(1.55rem, 3vw, 2.15rem);
    font-weight: 600;
    letter-spacing: -0.035em;
    line-height: 1.12;
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

  .muted {
    margin: 10px 0 0;
    color: var(--muted);
    font-size: 1rem;
    line-height: 1.65;
    max-width: 48ch;
  }

  .preview {
    margin: 38px 0 0;
  }
  .preview-window {
    position: relative;
    overflow: hidden;
    aspect-ratio: 16 / 8.8;
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

  .stepper {
    margin-top: 34px;
  }
  .stepper ol {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px 28px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .stepper li {
    position: relative;
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    align-items: start;
    gap: 10px;
    padding: 13px 0;
    border-top: 1px solid var(--line);
    color: #988b86;
  }
  .step-number {
    color: #b09f98;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.1em;
  }
  .stepper strong,
  .stepper small {
    display: block;
  }
  .stepper strong {
    color: #716560;
    font-size: 0.9rem;
    font-weight: 650;
  }
  .stepper small {
    margin-top: 3px;
    font-size: 0.76rem;
    line-height: 1.4;
  }
  .stepper li.active {
    border-color: var(--accent-deep);
  }
  .stepper li.active .step-number,
  .stepper li.active strong {
    color: var(--accent-deep);
  }

  .login-card {
    position: sticky;
    top: 28px;
    margin-top: 34px;
    padding: clamp(28px, 4vw, 42px);
    border: 1px solid rgba(219, 197, 190, 0.72);
    border-radius: 20px;
    background: rgba(255, 253, 251, 0.91);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.95),
      0 32px 72px -42px rgba(76, 39, 49, 0.5);
    backdrop-filter: blur(20px) saturate(1.08);
  }
  .card-label {
    color: var(--gold);
  }
  .login-card h2 {
    max-width: 11ch;
    margin-top: 12px;
    font-size: clamp(2rem, 3.5vw, 2.75rem);
    line-height: 1.03;
    text-wrap: balance;
  }
  .card-copy {
    margin: 16px 0 0;
    color: var(--muted);
    font-size: 0.95rem;
    line-height: 1.65;
  }

  .google-button {
    display: inline-flex;
    width: 100%;
    min-height: 54px;
    align-items: center;
    justify-content: center;
    gap: 11px;
    margin-top: 25px;
    padding: 14px 18px;
    border: 1px solid var(--accent-deep);
    border-radius: 11px;
    background: var(--accent-deep);
    box-shadow: 0 16px 30px -19px rgba(143, 29, 69, 0.9);
    color: white;
    font: 650 0.92rem/1.2 'Outfit', sans-serif;
    white-space: nowrap;
    cursor: pointer;
    transition: transform 180ms ease, background 180ms ease, box-shadow 180ms ease;
  }
  .google-button:hover:not(:disabled) {
    background: #761638;
    box-shadow: 0 19px 34px -18px rgba(143, 29, 69, 0.95);
    transform: translateY(-2px);
  }
  .google-button:active:not(:disabled) {
    transform: translateY(0) scale(0.99);
  }
  .google-button:disabled {
    cursor: wait;
    opacity: 0.76;
  }
  .google-icon {
    width: 20px;
    height: 20px;
    flex: none;
    padding: 2px;
    border-radius: 3px;
    background: white;
  }
  .spinner {
    width: 17px;
    height: 17px;
    border: 2px solid rgba(255, 255, 255, 0.36);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 700ms linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .login-note {
    margin: 12px 0 0;
    color: var(--muted);
    font-size: 0.73rem;
    text-align: center;
  }
  .login-note span {
    padding: 0 4px;
    color: var(--gold);
  }
  .rule {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 28px 0 21px;
    color: #b89d92;
  }
  .rule span {
    height: 1px;
    flex: 1;
    background: var(--line);
  }
  .rule i {
    font: 400 0.85rem/1 'Playfair Display', serif;
  }
  .reassurance {
    display: grid;
    gap: 13px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .reassurance li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    color: #554b47;
    font-size: 0.84rem;
    line-height: 1.45;
  }
  .reassurance li span {
    display: grid;
    width: 18px;
    height: 18px;
    flex: none;
    place-items: center;
    border-radius: 50%;
    background: var(--blush);
    color: var(--accent-deep);
    font-size: 0.68rem;
    font-weight: 700;
  }

  .owner-error {
    margin: 0 0 16px;
    padding: 14px;
    border: 1px solid rgba(143, 29, 69, 0.2);
    border-radius: 11px;
    background: #fff4f6;
    color: var(--accent-deep);
    font-size: 0.875rem;
    line-height: 1.45;
  }

  .login-skeleton {
    display: grid;
    gap: 14px;
  }
  .skeleton-line,
  .skeleton-button {
    display: block;
    border-radius: 7px;
    background: linear-gradient(90deg, #f1e7e4, #fbf4f1, #f1e7e4);
    background-size: 200% 100%;
    animation: shimmer 1.4s ease infinite;
  }
  .skeleton-line {
    height: 12px;
  }
  .skeleton-line.short {
    width: 36%;
  }
  .skeleton-line.heading {
    width: 78%;
    height: 34px;
    margin-top: 7px;
  }
  .skeleton-line.medium {
    width: 70%;
  }
  .skeleton-button {
    height: 54px;
    margin-top: 14px;
  }
  @keyframes shimmer {
    to {
      background-position: -200% 0;
    }
  }

  .panel {
    padding: clamp(20px, 3vw, 28px);
    border: 1px solid rgba(255, 255, 255, 0.8);
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.78);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.9),
      0 30px 70px -42px rgba(83, 38, 54, 0.42);
    backdrop-filter: blur(22px) saturate(1.1);
  }

  .layout-split {
    display: grid;
    gap: 14px;
  }

  .account-name {
    font-size: 1.35rem;
  }

  .mono {
    font-variant-numeric: tabular-nums;
    font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
    font-size: 0.875rem;
  }

  .invite-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .slug-title {
    font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
    font-size: clamp(1.35rem, 2.5vw, 1.75rem);
    letter-spacing: -0.02em;
  }

  .badge {
    flex: none;
    padding: 6px 9px;
    border: 1px solid var(--line);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .badge[data-status='active'] {
    border-color: color-mix(in srgb, var(--ok) 40%, var(--line));
    color: var(--ok);
    background: color-mix(in srgb, var(--ok) 8%, var(--surface));
  }
  .badge[data-status='draft'] {
    color: var(--muted);
  }

  .couple {
    margin: 14px 0 0;
    font-size: 1.05rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .meta-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px 20px;
    margin: 20px 0 0;
  }
  dt {
    color: var(--muted);
    font-size: 0.6875rem;
    font-weight: 650;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  dd {
    margin: 4px 0 0;
    font-size: 0.9rem;
  }

  .draft-note {
    margin: 20px 0 0;
    padding: 12px 14px;
    border-left: 3px solid var(--line);
    color: var(--muted);
    font-size: 0.875rem;
    line-height: 1.55;
  }

  .create-panel .muted {
    margin-bottom: 4px;
  }

  .form {
    display: grid;
    gap: 16px;
    margin-top: 18px;
  }

  label {
    display: grid;
    gap: 8px;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--line);
    border-radius: 0;
    padding: 12px 14px;
    background: #fff;
    color: var(--ink);
    font: 400 0.9375rem/1.4 'Outfit', 'Segoe UI', system-ui, sans-serif;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  input:focus {
    outline: none;
    border-color: color-mix(in srgb, var(--accent) 55%, var(--line));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 16%, transparent);
  }

  .slug-row {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: stretch;
    gap: 0;
  }
  .slug-row input {
    border-right: 0;
  }
  .slug-suffix {
    display: grid;
    place-items: center;
    padding: 0 12px;
    border: 1px solid var(--line);
    background: color-mix(in srgb, var(--paper) 70%, var(--surface));
    color: var(--muted);
    font-size: 0.8125rem;
    white-space: nowrap;
  }

  .name-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  button,
  .link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    cursor: pointer;
    font: 650 0.8125rem/1 'Outfit', 'Segoe UI', system-ui, sans-serif;
    letter-spacing: -0.01em;
    transition: background 0.15s ease, opacity 0.15s ease, transform 0.15s ease;
  }

  .primary {
    width: fit-content;
    padding: 12px 16px;
    border-radius: 999px;
    background: var(--accent-deep);
    color: #fff;
    box-shadow: 0 14px 32px -16px rgba(159, 35, 72, 0.72);
  }
  .primary:hover:not(:disabled) {
    background: #861b3b;
    transform: translateY(-1px);
  }
  .primary:active:not(:disabled) {
    transform: scale(0.98);
  }
  .primary.large,
  .link.large {
    min-height: 50px;
    padding: 15px 22px;
    margin-top: 8px;
    font-size: 0.9375rem;
  }

  button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  a:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }

  /* ─── Marketing sections ─── */
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

  .eyebrow-deep {
    margin: 0 0 10px;
    color: var(--accent-deep);
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .preview-section {
    background: rgba(255, 255, 255, 0.88);
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
  }

  .device-stage {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
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
    margin: -18.5rem 1.25rem 0 auto;
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
  .closing-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
    margin-top: 24px;
  }

  /* ─── Responsive ─── */
  @media (max-width: 900px) {
    .journey {
      grid-template-columns: minmax(0, 1.08fr) minmax(18rem, 0.92fr);
      gap: 30px;
    }
    .stepper ol {
      grid-template-columns: 1fr;
    }
    .login-card {
      padding: 28px;
    }
    .topbar-right .session-chip {
      display: none;
    }
    .section-head:not(.center) {
      flex-direction: column;
      align-items: flex-start;
    }
    .why-grid,
    .steps-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 720px) {
    .journey {
      grid-template-columns: minmax(0, 1fr);
      padding-top: 32px;
    }
    .login-card {
      position: relative;
      top: auto;
      margin-top: 0;
    }
    .preview {
      margin-top: 30px;
    }
    .stepper ol {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 560px) {
    .topbar {
      padding-inline: 14px;
    }
    .topbar-right {
      gap: 8px;
    }
    .wordmark {
      font-size: 1.48rem;
    }
    .journey,
    .workspace {
      padding-inline: 18px;
      padding-bottom: 48px;
    }
    h1 {
      font-size: clamp(2.7rem, 13.5vw, 4rem);
    }
    .lead {
      margin-top: 19px;
      line-height: 1.65;
    }
    .preview-window {
      border-radius: 13px;
    }
    .stepper {
      margin-top: 27px;
    }
    .stepper ol {
      grid-template-columns: 1fr;
    }
    .login-card {
      padding: 25px 21px;
      border-radius: 16px;
    }
    .google-button {
      font-size: 0.84rem;
    }
    .name-row,
    .meta-grid,
    .slug-row {
      grid-template-columns: 1fr;
    }
    .slug-row input {
      border-right: 1px solid var(--line);
    }
    .slug-suffix {
      justify-content: start;
      min-height: 40px;
    }
    .section-inner {
      padding-inline: 18px;
    }
    .phone-frame {
      width: min(140px, 38%);
      margin-top: -14.5rem;
      margin-right: 0.75rem;
    }
    .closing {
      padding: 28px 20px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    button,
    .link,
    input {
      transition: none;
    }
    .primary:active:not(:disabled) {
      transform: none;
    }
    .spinner,
    .skeleton-line,
    .skeleton-button {
      animation: none;
    }
    .primary-btn,
    .ghost-btn,
    .why-card {
      transition: none;
    }
    .primary-btn:active,
    .ghost-btn:hover,
    .why-card:hover {
      transform: none;
    }
  }
</style>
