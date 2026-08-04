<script lang="ts">
  import { onMount } from 'svelte'
  import './dashboard.css'
  import {
    ApiError,
    createInvitation,
    getMyConfig,
    getMyGuestbook,
    getMyInvitation,
    getUserSession,
    logoutUser,
    startGoogleLogin,
    updateMyConfig,
    type GuestbookEntry,
    type GuestbookStats,
    type OwnerInvitation,
    type UserAccount,
    type WeddingConfig,
  } from '$lib/api-client'
  import BrideGroomEditor from './editor/BrideGroomEditor.svelte'
  import EventDetailsEditor from './editor/EventDetailsEditor.svelte'
  import EnvelopeEditor from './editor/EnvelopeEditor.svelte'
  import LocationEditor from './editor/LocationEditor.svelte'
  import GalleryEditor from './editor/GalleryEditor.svelte'
  import QuoteEditor from './editor/QuoteEditor.svelte'
  import MusicEditor from './editor/MusicEditor.svelte'
  import GuestbookManager from './dashboard/GuestbookManager.svelte'
  import PaymentManager from './dashboard/PaymentManager.svelte'
  import InvitationSender from './dashboard/InvitationSender.svelte'
  import OnboardingWizard from './OnboardingWizard.svelte'

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

  // Workspace Navigation & Sub-tabs
  let activeTab = $state<'edit' | 'tamu' | 'pembayaran' | 'preview' | 'pengaturan' | 'kirim'>('edit')
  let editSubTab = $state<'mempelai' | 'acara' | 'amplop' | 'lokasi' | 'galeri' | 'quote' | 'musik'>('mempelai')

  // Config & Payment & Guestbook State
  let myConfig = $state<WeddingConfig | null>(null)
  let myGuestbook = $state<{ items: GuestbookEntry[]; stats: GuestbookStats } | null>(null)
  let loadingConfig = $state(false)
  let loadingGuestbook = $state(false)
  let savingConfig = $state(false)
  let configSavedMsg = $state('')
        
  // UI Interactive Modals & Toasts
  let showQrModal = $state(false)
  let copiedToast = $state(false)
  let avatarError = $state(false)

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
    if (status === 'draft') return 'Draft'
    if (status === 'pending_verification') return 'Menunggu Verifikasi Admin'
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
        startGoogleLogin('/account')
      } catch {
        busy = false
        error = 'Login Google belum berhasil.'
      }
    })
  }

  async function loadConfig() {
    if (!invitation) return
    loadingConfig = true
    try {
      myConfig = await getMyConfig()
    } catch {
      myConfig = null
    } finally {
      loadingConfig = false
    }
  }

  async function loadGuestbook() {
    if (!invitation) return
    loadingGuestbook = true
    try {
      myGuestbook = await getMyGuestbook()
    } catch {
      myGuestbook = null
    } finally {
      loadingGuestbook = false
    }
  }

  async function bootstrap() {
    loading = true
    try {
      const session = await getUserSession()
      user = session.user
      const mine = await getMyInvitation()
      invitation = mine.invitation
      if (invitation) {
        await Promise.all([loadConfig(), loadGuestbook()])
      }
      error = ''
      if (user && window.location.pathname === '/') {
        window.location.href = '/account'
        return
      }
    } catch (err) {
      user = null
      invitation = null
      if (!(err instanceof ApiError) || err.status !== 401) {
        error = 'Login Google belum berhasil.'
      }
      if (window.location.pathname === '/account') {
        window.location.href = '/'
        return
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
      myConfig = null
      myGuestbook = null
      if (window.location.pathname === '/account') {
        window.location.href = '/'
      }
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
      await Promise.all([loadConfig(), loadGuestbook()])
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Undangan gagal dibuat.'
    } finally {
      busy = false
    }
  }

  async function saveConfig() {
    if (!myConfig) return
    savingConfig = true
    configSavedMsg = ''
    try {
      myConfig = await updateMyConfig(myConfig)
      configSavedMsg = 'Perubahan berhasil disimpan!'
      setTimeout(() => (configSavedMsg = ''), 3500)
    } catch (err) {
      configSavedMsg = err instanceof ApiError ? `Gagal: ${err.message}` : 'Gagal menyimpan perubahan.'
    } finally {
      savingConfig = false
    }
  }

      function copyLink() {
    if (!invitation) return
    void navigator.clipboard.writeText(invitation.public_url)
    copiedToast = true
    setTimeout(() => (copiedToast = false), 2500)
  }

  // Progress Engine Calculation
  interface TaskItem {
    id: string
    label: string
    category: string
    done: boolean
    targetTab: 'edit' | 'pembayaran' | 'preview' | 'pengaturan'
    targetSubTab?: 'mempelai' | 'acara' | 'amplop' | 'lokasi' | 'galeri' | 'quote' | 'musik'
  }

  function calculateProgress() {
    if (!myConfig || !invitation) {
      return { percent: 0, completedCount: 0, totalCount: 6, tasks: [] as TaskItem[] }
    }

    const isCustom = (val?: string, defaultVal = '') =>
      Boolean(val && val.trim() && val.trim() !== defaultVal)

    const tasks: TaskItem[] = [
      {
        id: 'mempelai',
        label: 'Data Mempelai Pria & Wanita',
        category: 'Mempelai',
        done: isCustom(myConfig.bride_name, 'Mempelai Wanita') && isCustom(myConfig.groom_name, 'Mempelai Pria'),
        targetTab: 'edit',
        targetSubTab: 'mempelai',
      },
      {
        id: 'acara',
        label: 'Detail Acara Akad & Resepsi',
        category: 'Acara',
        done: isCustom(myConfig.wedding_date) && isCustom(myConfig.akad_date) && isCustom(myConfig.resepsi_date),
        targetTab: 'edit',
        targetSubTab: 'acara',
      },
      {
        id: 'galeri',
        label: 'Foto Utama & Galeri 3D Scene',
        category: 'Galeri',
        done: Boolean((myConfig.gallery_photos && myConfig.gallery_photos.length > 0) || isCustom(myConfig.wedding_photo)),
        targetTab: 'edit',
        targetSubTab: 'galeri',
      },
      {
        id: 'amplop',
        label: 'Amplop Digital & Rekening Transfer',
        category: 'Amplop',
        done: isCustom(myConfig.bank_account) || isCustom(myConfig.qris_image),
        targetTab: 'edit',
        targetSubTab: 'amplop',
      },
      {
        id: 'lokasi',
        label: 'Alamat Venue & Google Maps',
        category: 'Lokasi',
        done: isCustom(myConfig.venue_address) || isCustom(myConfig.maps_url),
        targetTab: 'edit',
        targetSubTab: 'lokasi',
      },
      {
        id: 'pembayaran',
        label: 'Pembayaran & Verifikasi Admin',
        category: 'Status',
        done: invitation.status === 'active' || invitation.status === 'pending_verification',
        targetTab: 'pembayaran',
      },
    ]

    const completedCount = tasks.filter((t) => t.done).length
    const percent = Math.round((completedCount / tasks.length) * 100)
    return { percent, completedCount, totalCount: tasks.length, tasks }
  }

  function navigateToTask(task: TaskItem) {
    activeTab = task.targetTab
    if (task.targetSubTab) {
      editSubTab = task.targetSubTab
    }
  }

  function fmtDate(ts: string): string {
    if (!ts) return '-'
    return new Date(ts).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  let progress = $derived(calculateProgress())
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
        <div class="profile-chip-wrapper" title={user.email || user.displayName}>
          {#if user.avatarUrl && !avatarError}
            <img src={user.avatarUrl} alt={user.displayName} class="user-avatar" onerror={() => (avatarError = true)} />
          {:else}
            <div class="avatar-fallback">{user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}</div>
          {/if}
          <div class="user-info">
            <span class="user-name">{user.displayName}</span>
            {#if user.email}<span class="user-email">{user.email}</span>{/if}
          </div>
        </div>
        <button type="button" class="ghost logout-btn" disabled={busy} onclick={() => void handleLogout()}>Keluar</button>
      {/if}
    </div>
  </header>

  <!-- Toast Notification -->
  {#if copiedToast}
    <div class="toast-notification" role="status">
      ✓ Link undangan berhasil disalin ke clipboard!
    </div>
  {/if}

  {#if !user}
    <!-- Logged Out Onboarding Section -->
    <section class="journey" aria-labelledby="journey-title">
      <div class="story-column">
        <p class="eyebrow">Mulai perjalanan kalian</p>
        <h1 id="journey-title"><span class="title-lead">Buat undangan yang terasa seperti</span> <em>dunia kalian sendiri</em></h1>
        <p class="lead">
          Pengalaman berkesan & tak terlupakan dengan dunia 3 dimensi
        </p>

        <figure class="preview">
          <div class="preview-window">
            <img
              src="/documentation/example_show.png"
              alt="Contoh dunia undangan pernikahan 3D MarryMe"
            />
            <div class="preview-shine" aria-hidden="true"></div>
          </div>
          <figcaption><span aria-hidden="true"></span> Dunia undangan MarryMe</figcaption>
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
          <h2 id="login-title">Sekali klik</h2>
          <p class="card-copy">untuk menyimpan progres dan mengelola undangan kalian.</p>

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
              src="/documentation/resepsionis.png"
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
            <button type="button" class="primary-btn large" onclick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Buat undangan gratis</button>
            <a class="ghost-btn large" href={DEMO_URL} target="_blank" rel="noreferrer">Lihat demo</a>
          </div>
        </div>
      </div>
    </section>

  {:else}
    <!-- Logged In Workspace Section -->
    <section class="workspace" aria-labelledby="owner-title">
      {#if error}<p class="owner-error" role="alert">{error}</p>{/if}

      {#if invitation}
        <!-- Logged In Hero & Progress Header -->
        <div class="hero-progress-card">
          <div class="hero-header-row">
            <div>
              <h1 id="owner-title">
                {#if myConfig?.bride_name && myConfig?.groom_name}
                  {myConfig.bride_name} &amp; {myConfig.groom_name}
                {:else}
                  Undangan {user.displayName}
                {/if}
              </h1>
              <p class="hero-subtitle">
                Progress Kelengkapan: <strong>{progress.percent}%</strong> ({progress.completedCount} dari {progress.totalCount} komponen selesai)
              </p>
            </div>
            <div class="status-badge-box">
              <span class="badge large" data-status={invitation.status}>
                {statusLabel(invitation.status)}
              </span>
            </div>
          </div>

          <!-- Progress Bar Visual -->
          <div class="progress-bar-container">
            <div class="progress-bar-track">
              <div class="progress-bar-fill" style="width: {progress.percent}%;"></div>
            </div>
          </div>

          <!-- Status Consequence Alert Banner -->
          <div class="status-alert-box" data-status={invitation.status}>
             {#if invitation.status === 'draft' && invitation.rejection_reason}
               <div class="status-alert-content">
                 <span class="alert-icon">!</span>
                 <div>
                   <strong>Status: Bukti Pembayaran Perlu Diperbaiki</strong>
                   <p>{invitation.rejection_reason}</p>
                 </div>
               </div>
             {:else if invitation.status === 'draft'}
              <div class="status-alert-content">
                <span class="alert-icon">💡</span>
                <div>
                  <strong>Status: Draft (Belum Dipublikasikan)</strong>
                  <p>Lengkapi detail acara dan unggah bukti pada tab <em>Pembayaran</em> agar tim admin dapat memverifikasi &amp; mengaktifkan undangan kalian.</p>
                </div>
              </div>
            {:else if invitation.status === 'pending_verification'}
              <div class="status-alert-content">
                <span class="alert-icon">⏳</span>
                <div>
                  <strong>Status: Menunggu Verifikasi Admin</strong>
                  <p>Bukti transfer telah diterima. Tim admin sedang memproses verifikasi. Undangan akan otomatis aktif setelah disetujui.</p>
                </div>
              </div>
            {:else if invitation.status === 'active'}
              <div class="status-alert-content">
                <span class="alert-icon">🎉</span>
                <div>
                  <strong>Status: Aktif! (Dunia 3D Sudah Terbit)</strong>
                  <p>Undangan pernikahan kalian sudah aktif dan dapat diakses publik oleh seluruh keluarga serta para tamu.</p>
                </div>
              </div>
            {/if}
          </div>
        </div>

        <!-- Dashboard Control Grid -->
        <div class="workspace-control-grid">
          <!-- Subdomain & Copy Link Card -->
          <div class="control-card link-card">
            <p class="control-label">Link Undangan Eksklusif Untuk Kamu</p>
            <h2 class="subdomain-url"><code>{invitation.public_url.replace(/^https?:\/\//, '')}</code></h2>
            <p class="subdomain-note"></p>

            <div class="link-actions-row">
              <button type="button" class="primary-btn-sm" onclick={copyLink}>
                📋 Salin Link
              </button>
               {#if invitation.status === 'active'}
               <a class="ghost-btn-sm" href={invitation.public_url} target="_blank" rel="noreferrer">
                 ↗ Buka Undangan
               </a>
               {/if}
               {#if invitation.status === 'active'}
               <button type="button" class="ghost-btn-sm" onclick={() => (showQrModal = true)}>
                 📱 QR Code
               </button>
               {/if}
            </div>
          </div>

          <!-- Quick Interactive Task Checklist -->
          <div class="control-card checklist-card">
            <p class="control-label">Checklist Langkah Pengerjaan</p>
            <div class="checklist-grid">
              {#each progress.tasks as task}
                <button
                  type="button"
                  class="task-chip"
                  class:task-done={task.done}
                  onclick={() => navigateToTask(task)}
                >
                  <span class="task-icon">{task.done ? '✓' : '!'}</span>
                  <span class="task-label">{task.label}</span>
                  <span class="task-arrow">→</span>
                </button>
              {/each}
            </div>
          </div>
        </div>

        <!-- Primary Workspace Tabs -->
        <nav class="owner-tabs" aria-label="Navigasi Utama Workspace">
          <button
            type="button"
            class="tab-btn"
            class:active={activeTab === 'edit'}
            onclick={() => (activeTab = 'edit')}
          >
            ✏️ Detail Undangan
          </button>

          <button
            type="button"
            class="tab-btn"
            class:active={activeTab === 'tamu'}
            onclick={() => {
              activeTab = 'tamu'
              void loadGuestbook()
            }}
          >
            💌 Buku Tamu &amp; RSVP {#if myGuestbook?.stats.total}<span class="tab-badge">{myGuestbook.stats.total}</span>{/if}
          </button>

          <button
            type="button"
            class="tab-btn"
            class:active={activeTab === 'pembayaran'}
            onclick={() => (activeTab = 'pembayaran')}
          >
            💳 Pembayaran &amp; Paket
          </button>

          <button
            type="button"
            class="tab-btn"
            class:active={activeTab === 'preview'}
            onclick={() => (activeTab = 'preview')}
          >
            🌐 Preview Dunia 3D
          </button>

          <button
            type="button"
            class="tab-btn"
            class:active={activeTab === 'pengaturan'}
            onclick={() => (activeTab = 'pengaturan')}
          >
            ⚙️ Pengaturan
          </button>
          <button
            type="button"
            class="tab-btn"
            class:active={activeTab === 'kirim'}
            onclick={() => (activeTab = 'kirim')}
          >
            📲 Kirim Undangan
          </button>
        </nav>

        <!-- Tab 1: Detail Undangan Editor -->
        {#if activeTab === 'edit'}
          <div class="workspace-panel">
            <!-- Sub-tab Bar -->
            <div class="sub-tab-bar">
              <button
                type="button"
                class="sub-tab-btn"
                class:active={editSubTab === 'mempelai'}
                onclick={() => (editSubTab = 'mempelai')}
              >
                Data Mempelai
              </button>
              <button
                type="button"
                class="sub-tab-btn"
                class:active={editSubTab === 'acara'}
                onclick={() => (editSubTab = 'acara')}
              >
                Detail Acara
              </button>
              <button
                type="button"
                class="sub-tab-btn"
                class:active={editSubTab === 'amplop'}
                onclick={() => (editSubTab = 'amplop')}
              >
                Amplop Digital &amp; Bank
              </button>
              <button
                type="button"
                class="sub-tab-btn"
                class:active={editSubTab === 'lokasi'}
                onclick={() => (editSubTab = 'lokasi')}
              >
                Lokasi Venue
              </button>
              <button
                type="button"
                class="sub-tab-btn"
                class:active={editSubTab === 'galeri'}
                onclick={() => (editSubTab = 'galeri')}
              >
                Galeri Foto 3D
              </button>
              <button
                type="button"
                class="sub-tab-btn"
                class:active={editSubTab === 'quote'}
                onclick={() => (editSubTab = 'quote')}
              >
                💬 Quote &amp; Pesan
              </button>
              <button
                type="button"
                class="sub-tab-btn"
                class:active={editSubTab === 'musik'}
                onclick={() => (editSubTab = 'musik')}
              >
                🎶 Musik
              </button>
            </div>

            {#if loadingConfig}
              <p class="muted-loading">Memuat data konfigurasi...</p>
            {:else if myConfig}
              <form class="config-editor-form" onsubmit={(e) => { e.preventDefault(); void saveConfig() }}>
                {#if editSubTab === 'mempelai'}
                  <BrideGroomEditor bind:config={myConfig} />
                {:else if editSubTab === 'acara'}
                  <EventDetailsEditor bind:config={myConfig} />
                {:else if editSubTab === 'amplop'}
                  <EnvelopeEditor bind:config={myConfig} />
                {:else if editSubTab === 'lokasi'}
                  <LocationEditor bind:config={myConfig} />
                {:else if editSubTab === 'galeri'}
                  <GalleryEditor bind:config={myConfig} />
                {:else if editSubTab === 'quote'}
                  <QuoteEditor bind:config={myConfig} />
                {:else if editSubTab === 'musik'}
                  <MusicEditor bind:config={myConfig} />
                {/if}

                <!-- Save Action Footer Bar -->
                <div class="form-save-footer">
                  <button type="submit" class="primary-btn-lg" disabled={savingConfig}>
                    {savingConfig ? 'Menyimpan...' : '💾 Simpan Perubahan'}
                  </button>
                  {#if configSavedMsg}
                    <span class="save-msg" class:error-msg={configSavedMsg.startsWith('Gagal')}>
                      {configSavedMsg}
                    </span>
                  {/if}
                </div>
              </form>
            {/if}
          </div>

        <!-- Tab 2: Tamu & Buku Tamu -->
        {:else if activeTab === 'tamu'}
          <GuestbookManager {invitation} {myGuestbook} {loadingGuestbook} {loadGuestbook} {fmtDate} />

        <!-- Tab 3: Pembayaran & Paket -->
        {:else if activeTab === 'pembayaran'}
          <PaymentManager 
            {invitation} 
            {myConfig} 
            {fmtDate} 
            onStatusChange={async () => {
              const latest = await getMyInvitation()
              invitation = latest.invitation
            }}
          />

        <!-- Tab 4: Preview -->
        {:else if activeTab === 'preview'}
          <div class="workspace-panel">
            <h3>Pratinjau Dunia 3D Undangan</h3>
            <p class="section-desc">Lihat secara langsung bagaimana dunia 3D pernikahan kalian ditampilkan kepada tamu.</p>

            <div class="preview-link-box">
              <a class="primary-btn-lg" href={invitation.public_url} target="_blank" rel="noreferrer">
                ↗ Buka {invitation.slug}.marryme.web.id
              </a>
            </div>

            <div class="preview-iframe-wrapper">
              <iframe src={invitation.public_url} title="Preview Dunia 3D Undangan"></iframe>
            </div>
          </div>

         {:else if activeTab === 'kirim'}
           <InvitationSender {invitation} {myConfig} />

         <!-- Tab 5: Pengaturan -->
        {:else if activeTab === 'pengaturan'}
          <div class="workspace-panel">
            <h3>Pengaturan Undangan &amp; Akun</h3>
            <p class="section-desc">Informasi teknis mengenai alamat domain dan sesi pengelola.</p>

            <div class="grid-2">
              <div class="settings-card">
                <h4>Status Subdomain</h4>
                <p>Alamat: <code>{invitation.slug}.marryme.web.id</code></p>
                <p>Status: <strong class="badge-inline" data-status={invitation.status}>{statusLabel(invitation.status)}</strong></p>
                <p>Zona Waktu: <code>{invitation.timezone}</code></p>
              </div>
              <div class="settings-card">
                <h4>Akun Pengelola</h4>
                <p>Nama: <strong>{user.displayName}</strong></p>
                <p>Email: <code>{user.email || '-'}</code></p>
                <button type="button" class="ghost-btn-sm mt-12" onclick={() => void handleLogout()}>Keluar dari Akun</button>
              </div>
            </div>
          </div>
        {/if}

      {:else}
        <!-- Logged In Form Create Invitation (If No Invitation Yet) -->
        <OnboardingWizard bind:slugInput bind:brideInput bind:groomInput {busy} {slugPattern} {handleCreate} />

      {/if}
    </section>
  {/if}

  <!-- Footer -->
  <footer class="site-footer">
    <div class="footer-inner">
      <p><span>MarryMe</span> by Jago Institute</p>
      <p class="footer-year">2026</p>
    </div>
  </footer>
</main>

<!-- QR Code Modal -->
{#if showQrModal && invitation}
  <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="qr-modal-title">
    <div
      class="modal-backdrop-click-target"
      role="button"
      tabindex="0"
      aria-label="Tutup modal"
      onclick={() => (showQrModal = false)}
      onkeydown={(e) => { if (e.key === 'Escape') showQrModal = false }}
    ></div>
    <div class="modal-card">
      <div class="modal-head">
        <h3 id="qr-modal-title">QR Code Undangan</h3>
        <button type="button" class="close-modal-btn" onclick={() => (showQrModal = false)}>✕</button>
      </div>
      <div class="modal-body">
        <p class="modal-desc">QR Code siap cetak untuk kartu undangan, meja penerima tamu, atau media cetak lainnya.</p>
        <div class="qr-image-wrapper">
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={encodeURIComponent(invitation.public_url)}"
            alt="QR Code {invitation.slug}"
          />
        </div>
        <p class="qr-url-text"><code>{invitation.public_url}</code></p>
      </div>
      <div class="modal-actions">
        <button type="button" class="primary-btn-sm" onclick={copyLink}>📋 Salin Link</button>
              {#if invitation.status === 'active'}
              <a
          class="ghost-btn-sm"
          href="https://api.qrserver.com/v1/create-qr-code/?size=500x500&data={encodeURIComponent(invitation.public_url)}"
          target="_blank"
          download="QR_{invitation.slug}.png"
        >
          💾 Unduh Gambar QR
              </a>
              {/if}
      </div>
    </div>
  </div>
{/if}
