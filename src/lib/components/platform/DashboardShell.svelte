<script lang="ts">
  import { onMount } from 'svelte'
  import './dashboard.css'
  import './landing/landing-v2.css'
  import {
    ApiError,
    createInvitation,
    getMyConfig,
    getMyGuestbook,
    getMyInvitation,
    getUserSession,
    logoutUser,
    startGoogleLogin,
    getPublicPricing,
    getPublicStats,
    type PublicPricing,
    type PublicStats,
    updateMyConfig,
    updateMySlug,
    type GuestbookEntry,
    type GuestbookStats,
    type OwnerInvitation,
    type UserAccount,
    type WeddingConfig,
  } from '$lib/api-client'
  import BrideGroomEditor from './editor/BrideGroomEditor.svelte'
  import EventDetailsEditor from './editor/EventDetailsEditor.svelte'
  import EnvelopeEditor from './editor/EnvelopeEditor.svelte'
  import GalleryEditor from './editor/GalleryEditor.svelte'
  import QuoteEditor from './editor/QuoteEditor.svelte'
  import MusicEditor from './editor/MusicEditor.svelte'
  import GuestbookManager from './dashboard/GuestbookManager.svelte'
  import PaymentManager from './dashboard/PaymentManager.svelte'
  import InvitationSender from './dashboard/InvitationSender.svelte'
  import OnboardingWizard from './OnboardingWizard.svelte'
  import SupportChat from './SupportChat.svelte'
  import LandingNav from './landing/LandingNav.svelte'
  import PromoBar from './landing/PromoBar.svelte'
  import Hero from './landing/Hero.svelte'
  import LoginModal from './landing/LoginModal.svelte'
  import { resolveVenue, venueOptions, type VenueId } from '$lib/venues'

  let loading = $state(true)
  let busy = $state(false)
  let user = $state<UserAccount | null>(null)
  let invitation = $state<OwnerInvitation | null>(null)
  let error = $state('')
  let slugInput = $state('')
  let brideInput = $state('')
  let groomInput = $state('')
  let onboardingPreset = $state<'3d_summer' | '2d_garden'>('3d_summer')
  let onboardingVenue = $state<VenueId>('garden')
  const slugPattern = '[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?'
  const DEMO_URL =
    (import.meta.env.VITE_DEMO_INVITATION_URL as string | undefined) ||
    'https://kia-toni.marryme.web.id'

  // Workspace Navigation & Sub-tabs
  let activeTab = $state<'edit' | 'tamu' | 'pembayaran' | 'preview' | 'pengaturan' | 'kirim'>('edit')
  // Konteks chat bantuan: subdomain + tab yang sedang dibuka, supaya admin tahu letak kendalanya.
  const supportContext = $derived(invitation ? `${invitation.slug} · ${activeTab}` : 'onboarding')
  let ownerTabs = $state<HTMLElement | null>(null)
  let editSubTab = $state<'mempelai' | 'acara' | 'amplop' | 'lokasi' | 'galeri' | 'quote' | 'musik'>('mempelai')

  // Landing v2: harga/promo + angka bukti sosial (publik, tanpa login) + modal login.
  let pricing = $state<PublicPricing | null>(null)
  let stats = $state<PublicStats | null>(null)
  let loginOpen = $state(false)
  function openLogin() {
    loginOpen = true
  }

  // Landing Page Preset Catalog State
  let activePresetTab = $state<'both' | '3d' | '2d'>('both')
  let previewDevicePreset = $state<'3d' | '2d'>('3d')

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

  $effect(() => {
    activeTab
    if (!ownerTabs) return
    const frame = requestAnimationFrame(() => {
      const active = ownerTabs?.querySelector<HTMLElement>('.tab-btn.active')
      if (!active) return
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      active.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'nearest' })
    })
    return () => cancelAnimationFrame(frame)
  })

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
    void getPublicPricing().then((p) => (pricing = p)).catch(() => {})
    void getPublicStats().then((st) => (stats = st)).catch(() => {})
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
    error = ''
    const normalizedSlug = slugInput.trim().toLowerCase()
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(normalizedSlug)) {
      error = 'Subdomain hanya boleh berisi huruf kecil (a-z), angka (0-9), dan tanda hubung (-).'
      return
    }

    busy = true
    try {
      const result = await createInvitation({
        slug: normalizedSlug,
        bride_name: brideInput.trim() || undefined,
        groom_name: groomInput.trim() || undefined,
        preset: onboardingPreset,
        venue: onboardingPreset === '3d_summer' ? onboardingVenue : undefined,
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

  let venueMsg = $state('')

  async function switchVenue(id: VenueId) {
    if (!myConfig || (myConfig.venue ?? 'garden') === id) return
    const previous = myConfig.venue
    myConfig.venue = id
    venueMsg = 'Menyimpan...'
    await saveConfig()
    if (configSavedMsg.startsWith('Gagal')) {
      if (myConfig) myConfig.venue = previous
      venueMsg = configSavedMsg
    } else {
      venueMsg = `✓ Venue diganti ke ${resolveVenue(id).label}`
      setTimeout(() => (venueMsg = ''), 3500)
    }
  }

      function copyLink() {
    if (!invitation) return
    void navigator.clipboard.writeText(invitation.public_url)
    copiedToast = true
    setTimeout(() => (copiedToast = false), 2500)
  }

  let editingSlug = $state(false)
  let newSlugInput = $state('')
  let slugError = $state('')
  let slugSuccessMsg = $state('')
  let savingSlug = $state(false)

  function startEditSlug() {
    if (!invitation) return
    newSlugInput = invitation.slug
    slugError = ''
    slugSuccessMsg = ''
    editingSlug = true
  }

  async function handleSaveSlug() {
    if (!invitation) return
    const normalized = newSlugInput.trim().toLowerCase()
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(normalized)) {
      slugError = 'Subdomain hanya boleh huruf kecil (a-z), angka (0-9), dan tanda hubung (-).'
      return
    }
    savingSlug = true
    slugError = ''
    slugSuccessMsg = ''
    try {
      const res = await updateMySlug(normalized)
      invitation = res.invitation
      slugSuccessMsg = 'Alamat subdomain berhasil diperbarui!'
      editingSlug = false
      setTimeout(() => (slugSuccessMsg = ''), 4000)
    } catch (err) {
      slugError = err instanceof ApiError ? err.message : 'Gagal memperbarui subdomain.'
    } finally {
      savingSlug = false
    }
  }

  // Progress Engine Calculation
  interface TaskItem {
    id: string
    label: string
    category: string
    done: boolean
    targetTab: 'edit' | 'pembayaran' | 'preview' | 'pengaturan'
    targetSubTab?: 'mempelai' | 'acara' | 'amplop' | 'galeri' | 'quote' | 'musik'
  }

  function calculateProgress() {
    if (!myConfig || !invitation) {
      return { percent: 0, completedCount: 0, totalCount: 5, tasks: [] as TaskItem[] }
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
        label: 'Jadwal Acara & Titik Lokasi Venue',
        category: 'Acara & Lokasi',
        done: Boolean((isCustom(myConfig.akad_date) || isCustom(myConfig.wedding_date)) && (isCustom(myConfig.venue_address) || isCustom(myConfig.maps_url))),
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
  <title>MarryMe — Undangan Pernikahan 3D yang Bisa Dijelajahi Tamu</title>
  <meta name="description" content="Undangan pernikahan 3D interaktif: tamu berjalan ke pelaminan, menulis ucapan, dan RSVP dari satu link. Gratis selama promo peluncuran." />
</svelte:head>

<main class="onboarding">
  <div class="botanical botanical-left" aria-hidden="true"></div>
  <div class="botanical botanical-right" aria-hidden="true"></div>
  <div class="blob blob-blush" aria-hidden="true"></div>
  <div class="blob blob-gold" aria-hidden="true"></div>

  {#if !user && !loading}
    <LandingNav {pricing} {busy} onLogin={openLogin} />
  {/if}

  <!-- Topbar Header (dashboard) -->
  {#if user || loading}
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
  {/if}

  <!-- Toast Notification -->
  {#if copiedToast}
    <div class="toast-notification" role="status">
      ✓ Link undangan berhasil disalin ke clipboard!
    </div>
  {/if}

  {#if !user}
    <!-- Logged Out: landing v2 -->
    {#if !loading}
      <PromoBar {pricing} onCta={openLogin} />
      <Hero {pricing} {stats} demoUrl={DEMO_URL} {busy} onCta={openLogin} />
    {/if}

    <section class="journey single" id="desain" aria-label="Katalog desain">
      <div class="story-column">
        <!-- Showcase 2 Preset Katalog -->
        <div class="preset-catalog" aria-label="Katalog Desain Undangan MarryMe">
          <div class="preset-tabs" role="tablist" aria-label="Pilih tampilan preset">
            <button
              type="button"
              role="tab"
              class="preset-tab-btn"
              class:active={activePresetTab === 'both'}
              onclick={() => activePresetTab = 'both'}
              aria-selected={activePresetTab === 'both'}
            >
              <span>Semua Preset (2)</span>
            </button>
            <button
              type="button"
              role="tab"
              class="preset-tab-btn"
              class:active={activePresetTab === '3d'}
              onclick={() => activePresetTab = '3d'}
              aria-selected={activePresetTab === '3d'}
            >
              <span>3D Island</span>
            </button>
            <button
              type="button"
              role="tab"
              class="preset-tab-btn"
              class:active={activePresetTab === '2d'}
              onclick={() => activePresetTab = '2d'}
              aria-selected={activePresetTab === '2d'}
            >
              <span>2D Garden</span>
              <span class="badge-mini-hot">Ringan</span>
            </button>
          </div>

          <div class="preset-grid" class:single-view={activePresetTab !== 'both'}>
            <!-- PRESET 1 CARD (3D WORLD) -->
            {#if activePresetTab === 'both' || activePresetTab === '3d'}
              <article class="preset-card card-3d">
                <header class="preset-header">
                  <div class="preset-badge-group">
                    <span class="badge-preset-num">PRESET 01</span>
                    <span class="badge-tag tag-3d">3D Immersive</span>
                  </div>
                  <h3 class="preset-title">Summer Fantasy Island</h3>
                  <p class="preset-desc">
                    Petualangan 3 dimensi interaktif. Tamu dapat berjalan menjelajahi pulau taman tropis yang indah dengan kontrol bebas dan suasana romantis.
                  </p>
                </header>

                <!-- Dual Mockup: Laptop + Phone -->
                <div class="preset-mockup-stage">
                  <div class="mockup-laptop">
                    <div class="laptop-screen">
                      <div class="mockup-chrome">
                        <span class="chrome-dot red"></span><span class="chrome-dot yellow"></span><span class="chrome-dot green"></span>
                        <span class="chrome-url">kia-toni.marryme.web.id</span>
                      </div>
                      <img src="/media/preset-3d-desktop.png" alt="Preset 1 - Tampilan Laptop 3D" class="laptop-img" />
                    </div>
                    <div class="laptop-base"></div>
                  </div>

                  <div class="mockup-phone">
                    <div class="phone-screen">
                      <div class="phone-notch"></div>
                      <img src="/media/preset-3d-mobile.png" alt="Preset 1 - Tampilan HP 3D" class="phone-img" />
                    </div>
                  </div>
                </div>

                <div class="preset-features">
                  <span class="feature-pill">
                    <span class="feature-pill-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="2" y="6" width="20" height="12" rx="6" fill="currentColor" fill-opacity="0.18" />
                        <line x1="6" y1="12" x2="10" y2="12" />
                        <line x1="8" y1="10" x2="8" y2="14" />
                        <circle cx="15.5" cy="10.5" r="1" fill="currentColor" />
                        <circle cx="17.5" cy="13.5" r="1" fill="currentColor" />
                      </svg>
                    </span>
                    <span>Joystick 3D &amp; WASD</span>
                  </span>
                  <span class="feature-pill">
                    <span class="feature-pill-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity="0.18" />
                        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" fill-opacity="0.4" />
                      </svg>
                    </span>
                    <span>Eksplorasi Pulau 3D</span>
                  </span>
                </div>

                <footer class="preset-footer">
                  <a
                    href="https://kia-toni.marryme.web.id"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn-demo-link"
                    title="Buka live demo Preset 1 3D di tab baru"
                  >
                    <span>Demo 3D</span>
                    <svg class="icon-arrow" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M5.22 14.78a.75.75 0 0 0 1.06 0l7.22-7.22v5.69a.75.75 0 0 0 1.5 0v-7.5a.75.75 0 0 0-.75-.75h-7.5a.75.75 0 0 0 0 1.5h5.69l-7.22 7.22a.75.75 0 0 0 0 1.06Z" clip-rule="evenodd" />
                    </svg>
                  </a>
                  <button type="button" class="btn-select-preset" onclick={openLogin}>
                    Pilih Desain
                  </button>
                </footer>
              </article>
            {/if}

            <!-- PRESET 2 CARD (2D PIXEL GARDEN) -->
            {#if activePresetTab === 'both' || activePresetTab === '2d'}
              <article class="preset-card card-2d">
                <header class="preset-header">
                  <div class="preset-badge-group">
                    <span class="badge-preset-num">PRESET 02</span>
                    <span class="badge-tag tag-2d">2D Pixel</span>
                  </div>
                  <h3 class="preset-title">Pixel Garden RPG</h3>
                  <p class="preset-desc">
                    Taman pernikahan retro pixel art yang sangat ringan di semua ponsel, dengan suasana danau romantis dan fitur multiplayer real-time.
                  </p>
                </header>

                <!-- Dual Mockup: Laptop + Phone -->
                <div class="preset-mockup-stage">
                  <div class="mockup-laptop">
                    <div class="laptop-screen">
                      <div class="mockup-chrome">
                        <span class="chrome-dot red"></span><span class="chrome-dot yellow"></span><span class="chrome-dot green"></span>
                        <span class="chrome-url">faris-eliza.marryme.web.id</span>
                      </div>
                      <img src="/media/preset-2d-desktop.png?v=3" alt="Preset 2 - Tampilan Laptop 2D" class="laptop-img" />
                    </div>
                    <div class="laptop-base"></div>
                  </div>

                  <div class="mockup-phone">
                    <div class="phone-screen">
                      <div class="phone-notch"></div>
                      <img src="/media/preset-2d-mobile.png?v=3" alt="Preset 2 - Tampilan HP 2D" class="phone-img" />
                    </div>
                  </div>
                </div>

                <div class="preset-features">
                  <span class="feature-pill">
                    <span class="feature-pill-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="9" cy="7" r="4" fill="currentColor" fill-opacity="0.18" />
                        <path d="M2 20a7 7 0 0 1 14 0" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        <path d="M22 20a7 7 0 0 0-6-6" />
                      </svg>
                    </span>
                    <span>Multiplayer Online Realtime</span>
                  </span>
                  <span class="feature-pill">
                    <span class="feature-pill-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" fill-opacity="0.22" />
                      </svg>
                    </span>
                    <span>Super Ringan &amp; Cepat Dimuat</span>
                  </span>
                </div>

                <footer class="preset-footer">
                  <a
                    href="/presets/garden-2d/index.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn-demo-link"
                    title="Buka live demo Preset 2 2D di tab baru"
                  >
                    <span>Demo 2D</span>
                    <svg class="icon-arrow" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M5.22 14.78a.75.75 0 0 0 1.06 0l7.22-7.22v5.69a.75.75 0 0 0 1.5 0v-7.5a.75.75 0 0 0-.75-.75h-7.5a.75.75 0 0 0 0 1.5h5.69l-7.22 7.22a.75.75 0 0 0 0 1.06Z" clip-rule="evenodd" />
                    </svg>
                  </a>
                  <button type="button" class="btn-select-preset" onclick={openLogin}>
                    Pilih Desain
                  </button>
                </footer>
              </article>
            {/if}
          </div>

          <div class="preset-notice">
            <span class="notice-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18h6" />
                <path d="M10 22h4" />
                <path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 6h8c1.5-1.5 3-3.5 3-6a7 7 0 0 0-7-7z" fill="currentColor" fill-opacity="0.18" />
                <line x1="12" y1="6" x2="12" y2="10" />
              </svg>
            </span>
            <span class="notice-text">
              <strong>Bebas beralih tema:</strong> Kalian bisa memilih preset favorit saat login, dan tema bisa diubah kapan saja di pengaturan dashboard tanpa mengetik ulang data.
            </span>
          </div>
        </div>

      </div>
    </section>

    <section class="preview-section" id="preview" aria-labelledby="preview-title">
      <div class="section-inner">
        <div class="section-head center">
          <div>
            <p class="eyebrow-deep">Live Preview 2 Preset</p>
            <h2 id="preview-title">Dunia yang sudah hidup</h2>
          </div>

          <div class="preview-preset-toggle" role="group" aria-label="Pilih preset untuk preview">
            <button
              type="button"
              class="preview-toggle-btn"
              class:active={previewDevicePreset === '3d'}
              onclick={() => previewDevicePreset = '3d'}
            >
              3D Open World
            </button>
            <button
              type="button"
              class="preview-toggle-btn"
              class:active={previewDevicePreset === '2d'}
              onclick={() => previewDevicePreset = '2d'}
            >
              2D Pixel RPG
            </button>
          </div>
        </div>

        {#if previewDevicePreset === '3d'}
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
                src="/media/preset-3d-mobile.png"
                alt="Preview undangan 3D di ponsel"
                class="phone-shot"
                loading="lazy"
                decoding="async"
              />
            </figure>
          </div>
        {:else}
          <div class="device-stage">
            <figure class="browser-frame">
              <div class="browser-chrome" aria-hidden="true">
                <span></span><span></span><span></span>
                <div class="browser-url">faris-eliza.marryme.web.id</div>
              </div>
              <video
                src="/media/demo_2d.mp4"
                poster="/media/demo_2d_poster.jpg"
                aria-label="Preview video undangan 2D di desktop"
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
                src="/media/preset-2d-mobile.png?v=3"
                alt="Preview undangan 2D di ponsel"
                class="phone-shot"
                loading="lazy"
                decoding="async"
              />
            </figure>
          </div>
        {/if}
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
            <button type="button" class="primary-btn large" onclick={openLogin}>Buat undangan gratis</button>
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
        <nav bind:this={ownerTabs} class="owner-tabs" aria-label="Navigasi Utama Workspace">
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
            💌 Buku Tamu {#if myGuestbook?.stats.total}<span class="tab-badge">{myGuestbook.stats.total}</span>{/if}
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
                💍 Data Mempelai
              </button>
              <button
                type="button"
                class="sub-tab-btn relative"
                class:active={editSubTab === 'acara'}
                onclick={() => (editSubTab = 'acara')}
              >
                📅 Detail Acara &amp; Lokasi
                {#if !myConfig?.maps_url || !myConfig?.venue_address}
                  <span class="ml-1 text-[10px] bg-amber-500 text-white font-extrabold px-1.5 py-0.5 rounded-full shadow-xs">!</span>
                {/if}
              </button>
              <button
                type="button"
                class="sub-tab-btn"
                class:active={editSubTab === 'amplop'}
                onclick={() => (editSubTab = 'amplop')}
              >
                💌 Amplop Digital &amp; Bank
              </button>
              <button
                type="button"
                class="sub-tab-btn"
                class:active={editSubTab === 'galeri'}
                onclick={() => (editSubTab = 'galeri')}
              >
                🖼️ Galeri Foto 3D
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
              <div class="settings-card col-span-2">
                <h4>Preset Desain Dunia Undangan</h4>
                <p class="section-desc" style="margin-bottom: 14px;">Bebas beralih antara 3D dan 2D kapan saja tanpa menghapus data pernikahan yang sudah diisi.</p>
                <div class="preset-theme-switch-grid">
                  <button
                    type="button"
                    class="theme-switch-card"
                    class:active={myConfig?.preset === '3d_summer' || !myConfig?.preset}
                    onclick={async () => {
                      if (!myConfig || myConfig.preset === '3d_summer') return
                      myConfig.preset = '3d_summer'
                      await saveConfig()
                    }}
                  >
                    <div class="theme-switch-head">
                      <strong>🌟 Preset 1: Dunia 3D Island</strong>
                      {#if myConfig?.preset === '3d_summer' || !myConfig?.preset}
                        <span class="badge-active">Aktif Digunakan</span>
                      {/if}
                    </div>
                    <p class="theme-switch-desc">Dunia 3D Three.js interaktif dengan avatar animasi, pelaminan, dan confetti.</p>
                  </button>

                  <button
                    type="button"
                    class="theme-switch-card"
                    class:active={myConfig?.preset === '2d_garden'}
                    onclick={async () => {
                      if (!myConfig || myConfig.preset === '2d_garden') return
                      myConfig.preset = '2d_garden'
                      await saveConfig()
                    }}
                  >
                    <div class="theme-switch-head">
                      <strong>🌿 Preset 2: Dunia 2D Pixel Garden</strong>
                      {#if myConfig?.preset === '2d_garden'}
                        <span class="badge-active green">Aktif Digunakan</span>
                      {/if}
                    </div>
                    <p class="theme-switch-desc">Retro pixel RPG yang sangat ringan di semua ponsel, air mancur & pianis romantis.</p>
                  </button>
                </div>
              </div>

              {#if myConfig?.preset === '3d_summer' || !myConfig?.preset}
                <div class="settings-card col-span-2">
                  <h4>Venue Dunia 3D</h4>
                  <p class="section-desc" style="margin-bottom: 14px;">Pilih lokasi pernikahan di dunia 3D. Isi undangan, posisi tamu, dan pelaminan tetap sama.</p>
                  <div class="preset-theme-switch-grid" role="radiogroup" aria-label="Pilih venue dunia 3D">
                    {#each venueOptions as option (option.id)}
                      {@const active = (myConfig?.venue ?? 'garden') === option.id}
                      <button
                        type="button"
                        role="radio"
                        aria-checked={active}
                        class="theme-switch-card venue-switch-card"
                        class:active
                        disabled={savingConfig}
                        onclick={() => switchVenue(option.id)}
                      >
                        <img src={option.thumbnail} alt="Venue {resolveVenue(option.id).label}" class="venue-switch-thumb" loading="lazy" />
                        <div class="theme-switch-head">
                          <strong>{option.emoji} {resolveVenue(option.id).label}</strong>
                          {#if active}
                            <span class="badge-active">Aktif Digunakan</span>
                          {/if}
                        </div>
                        <p class="theme-switch-desc">{option.description}</p>
                      </button>
                    {/each}
                  </div>
                  {#if venueMsg}
                    <p class="venue-switch-msg">{venueMsg} {#if venueMsg.startsWith('✓')}· <a href={invitation.public_url} target="_blank" rel="noreferrer">Lihat undangan ↗</a>{/if}</p>
                  {/if}
                </div>
              {/if}

              <div class="settings-card">
                <h4>Status Subdomain</h4>
                <p>Alamat: <code>{invitation.slug}.marryme.web.id</code></p>
                <p>Status: <strong class="badge-inline" data-status={invitation.status}>{statusLabel(invitation.status)}</strong></p>
                <p>Zona Waktu: <code>{invitation.timezone}</code></p>

                {#if !editingSlug}
                  <div class="mt-3 flex items-center gap-2">
                    <button type="button" class="ghost-btn-sm" onclick={startEditSlug}>
                      ✏️ Ubah Subdomain
                    </button>
                    {#if slugSuccessMsg}
                      <span class="text-xs text-emerald-600 font-medium">✓ {slugSuccessMsg}</span>
                    {/if}
                  </div>
                {:else}
                  <div class="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <label for="new-subdomain-input" class="block text-xs font-semibold text-slate-700 mb-1.5">
                      Subdomain Baru:
                    </label>
                    <div class="flex items-center gap-1.5">
                      <div class="flex items-center flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500">
                        <input
                          id="new-subdomain-input"
                          bind:value={newSlugInput}
                          placeholder="nama-pasangan"
                          class="w-full bg-transparent text-xs font-mono text-slate-800 outline-none"
                        />
                        <span class="text-[11px] text-slate-400 font-mono">.marryme.web.id</span>
                      </div>
                      <button
                        type="button"
                        class="primary-btn-sm text-xs py-1.5 px-3"
                        disabled={savingSlug}
                        onclick={handleSaveSlug}
                      >
                        {savingSlug ? 'Menyimpan...' : 'Simpan'}
                      </button>
                      <button
                        type="button"
                        class="ghost-btn-sm text-xs py-1.5 px-2"
                        disabled={savingSlug}
                        onclick={() => (editingSlug = false)}
                      >
                        Batal
                      </button>
                    </div>
                    {#if slugError}
                      <p class="text-xs text-rose-600 mt-1.5 font-medium">⚠️ {slugError}</p>
                    {/if}
                    <p class="text-[11px] text-slate-400 mt-1">
                      💡 Kalian bebas mengubah subdomain jika sebelumnya mengisi nama uji coba / acak.
                    </p>
                  </div>
                {/if}
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
        <OnboardingWizard bind:slugInput bind:brideInput bind:groomInput bind:presetInput={onboardingPreset} bind:venueInput={onboardingVenue} {busy} errorMessage={error} {handleCreate} />

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

  {#if !user && loginOpen}
    <LoginModal {busy} {error} onLogin={handleGoogleLogin} onClose={() => (loginOpen = false)} />
  {/if}
</main>

{#if user}
  <SupportChat context={supportContext} />
{/if}

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
