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
    type CharacterStyle,
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
  import DesignCatalog from './landing/DesignCatalog.svelte'
  import FeatureBlocks from './landing/FeatureBlocks.svelte'
  import Steps from './landing/Steps.svelte'
  import Pricing from './landing/Pricing.svelte'
  import Faq from './landing/Faq.svelte'
  import ClosingCta from './landing/ClosingCta.svelte'
  import WhatsAppFab from './landing/WhatsAppFab.svelte'
  import Icon from '$lib/components/icons/Icon.svelte'
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
  // Demo venue Pantai Sunset (undangan demo 3D dengan venue pantai).
  const DEMO_BEACH_URL =
    (import.meta.env.VITE_DEMO_BEACH_URL as string | undefined) ||
    'https://jajangglia.marryme.web.id'

  // Workspace Navigation & Sub-tabs
  let activeTab = $state<'edit' | 'tamu' | 'pembayaran' | 'pengaturan' | 'kirim'>('edit')
  // Konteks chat bantuan: subdomain + tab yang sedang dibuka, supaya admin tahu letak kendalanya.
  const supportContext = $derived(invitation ? `${invitation.slug} · ${activeTab}` : 'onboarding')
  let ownerTabs = $state<HTMLElement | null>(null)
  let editSubTab = $state<'mempelai' | 'acara' | 'amplop' | 'lokasi' | 'galeri' | 'quote' | 'musik'>('mempelai')
  // Di HP baris sub-tab bisa digeser; pastikan tombol yang dipilih selalu terlihat utuh.
  $effect(() => {
    void editSubTab
    requestAnimationFrame(() => {
      const btn = document.querySelector<HTMLElement>('.sub-tab-btn.active')
      const bar = btn?.parentElement
      if (!btn || !bar || bar.scrollWidth <= bar.clientWidth) return
      // Geser horizontal saja (scrollIntoView bisa ikut menggulir halaman).
      const left = btn.offsetLeft - bar.offsetLeft
      if (left < bar.scrollLeft || left + btn.offsetWidth > bar.scrollLeft + bar.clientWidth - 24) {
        bar.scrollTo({ left: Math.max(0, left - 16), behavior: 'smooth' })
      }
    })
  })

  // Landing v2: harga/promo + angka bukti sosial (publik, tanpa login) + modal login.
  let pricing = $state<PublicPricing | null>(null)
  let stats = $state<PublicStats | null>(null)
  let loginOpen = $state(false)
  function openLogin() {
    loginOpen = true
  }


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
    // Kembali dari halaman bayar Tako: langsung buka tab Pembayaran (status dicek di sana).
    if (params.get('bayar') === 'tako') activeTab = 'pembayaran'
    void bootstrap()
  })

  function authErrorMessage(code: string) {
    if (code === 'OAUTH_NOT_CONFIGURED') return 'Layanan masuk Google belum tersedia.'
    if (code === 'OAUTH_DENIED') return 'Proses masuk Google dibatalkan.'
    if (code === 'USER_SUSPENDED') return 'Akun ini belum dapat digunakan.'
    return 'Login Google belum berhasil.'
  }

  // ── Paket: uji coba / aktif selamanya ─────────────────────────────────────
  const plan = $derived(invitation?.trial ?? null)
  const planBoxStatus = $derived(
    plan?.phase === 'trial' || plan?.phase === 'trial_ended' ? plan.phase : (invitation?.status ?? ''),
  )
  let nowTick = $state(Date.now())
  $effect(() => {
    if (plan?.phase !== 'trial' && !plan?.offer_expires_at) return
    const timer = setInterval(() => (nowTick = Date.now()), 30_000)
    return () => clearInterval(timer)
  })
  const fmtWib = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' WIB'
      : ''
  const fmtRp = (n: number | null) => (n == null ? '' : `Rp${n.toLocaleString('id-ID')}`)
  function remainingLabel(iso: string | null) {
    if (!iso) return ''
    const ms = Math.max(0, new Date(iso).getTime() - nowTick)
    const d = Math.floor(ms / 86_400_000)
    const h = Math.floor((ms % 86_400_000) / 3_600_000)
    const m = Math.floor((ms % 3_600_000) / 60_000)
    return d > 0 ? `${d} hari ${h} jam` : h > 0 ? `${h} jam ${m} menit` : `${m} menit`
  }
  const offerActive = $derived(Boolean(plan?.offer_expires_at && new Date(plan.offer_expires_at).getTime() > nowTick))
  function openPayment() {
    activeTab = 'pembayaran'
    ownerTabs?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function planLabel(status: string) {
    if (plan?.phase === 'trial') return 'Aktif Terbatas'
    if (plan?.phase === 'trial_ended') return 'Masa Aktif Habis'
    if (plan?.phase === 'paid' && status === 'active') return 'Aktif selamanya'
    return statusLabel(status)
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
  let styleMsg = $state('')

  const characterStyleOptions: { id: CharacterStyle; label: string; thumbnail: string }[] = [
    { id: 'umum', label: 'Umum (tanpa hijab)', thumbnail: '/media/busana/umum.webp' },
    { id: 'hijab', label: 'Berhijab', thumbnail: '/media/busana/hijab.webp' },
  ]

  async function switchCharacterStyle(id: CharacterStyle) {
    if (!myConfig || (myConfig.character_style ?? 'umum') === id) return
    const previous = myConfig.character_style
    myConfig.character_style = id
    styleMsg = 'Menyimpan...'
    await saveConfig()
    if (configSavedMsg.startsWith('Gagal')) {
      if (myConfig) myConfig.character_style = previous
      styleMsg = configSavedMsg
    } else {
      styleMsg = `✓ Gaya busana diganti ke ${characterStyleOptions.find((o) => o.id === id)?.label}`
      setTimeout(() => (styleMsg = ''), 3500)
    }
  }

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
    targetTab: 'edit' | 'pembayaran' | 'pengaturan'
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
        label: invitation.trial?.phase === 'trial' || invitation.trial?.phase === 'trial_ended' ? 'Pembayaran (aktif selamanya)' : 'Pembayaran & Verifikasi Admin',
        category: 'Status',
        // Uji coba belum dihitung selesai walau statusnya 'active'.
        done:
          invitation.trial?.phase === 'trial' || invitation.trial?.phase === 'trial_ended'
            ? false
            : invitation.status === 'active' || invitation.status === 'pending_verification',
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
  <meta name="description" content="Undangan pernikahan 3D interaktif: tamu berjalan ke pelaminan, menulis ucapan, dan RSVP dari satu link. Gratis selama Promo Launching." />
</svelte:head>

<main class="onboarding">
  <div class="botanical botanical-left" aria-hidden="true"></div>
  <div class="botanical botanical-right" aria-hidden="true"></div>
  <div class="blob blob-blush" aria-hidden="true"></div>
  <div class="blob blob-gold" aria-hidden="true"></div>

  {#if !user && !loading}
    <LandingNav {busy} onLogin={openLogin} />
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

    <DesignCatalog {pricing} demoUrl={DEMO_URL} demoBeachUrl={DEMO_BEACH_URL} onSelect={openLogin} />

    <FeatureBlocks demoUrl={DEMO_URL} onCta={openLogin} />

    <Steps />
    <Pricing {pricing} onCta={openLogin} />
    <Faq {pricing} />
    <ClosingCta {pricing} {stats} demoUrl={DEMO_URL} onCta={openLogin} />
    {#if pricing?.whatsapp}
      <WhatsAppFab number={pricing.whatsapp} />
    {/if}

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
              <span class="badge large" data-status={planBoxStatus}>
                {planLabel(invitation.status)}
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
          <div class="status-alert-box" data-status={planBoxStatus}>
             {#if invitation.status === 'draft' && invitation.rejection_reason}
               <div class="status-alert-content">
                 <span class="alert-icon"><Icon name="alert" size={20} /></span>
                 <div>
                   <strong>Status: Bukti Pembayaran Perlu Diperbaiki</strong>
                   <p>{invitation.rejection_reason}</p>
                 </div>
               </div>
             {:else if invitation.status === 'draft'}
              <div class="status-alert-content">
                <span class="alert-icon"><Icon name="tip" size={20} /></span>
                <div>
                  <strong>Status: Draft (Belum Dipublikasikan)</strong>
                  <p>Lengkapi detail acara, lalu selesaikan pembayaran di tab <em>Pembayaran</em> (QRIS, GoPay). Undangan aktif otomatis setelah pembayaran berhasil.</p>
                </div>
              </div>
            {:else if invitation.status === 'pending_verification'}
              <div class="status-alert-content">
                <span class="alert-icon"><Icon name="clock" size={20} /></span>
                <div>
                  <strong>Status: Menunggu Verifikasi Admin</strong>
                  <p>Bukti transfer telah diterima. Tim admin sedang memproses verifikasi. Undangan akan otomatis aktif setelah disetujui.</p>
                </div>
              </div>
            {:else if plan?.phase === 'trial' || plan?.phase === 'trial_ended'}
              <div class="status-alert-content">
                <span class="alert-icon"><Icon name={plan.phase === 'trial' ? 'clock' : 'alert'} size={20} /></span>
                <div>
                  {#if plan.phase === 'trial'}
                    <strong>Aktif sampai {fmtWib(plan.trial_ends_at)} (sisa {remainingLabel(plan.trial_ends_at)})</strong>
                    <p>Bayar sekali agar undangan aktif selamanya. Saat ini undangan hanya 3 Hari aktif.</p>
                  {:else}
                    <strong>Masa aktif habis. Ayo aktifkan kembali hanya dengan {fmtRp(plan.price)}!</strong>
                    <p>Tamu belum bisa membuka undangan kalian. Semua isi tetap tersimpan; bayar sekali dan undangan aktif selamanya.</p>
                  {/if}
                  <div class="trial-cta">
                    <button type="button" class="trial-pay-btn" onclick={openPayment}>
                      Aktifkan selamanya ·
                      {#if offerActive}<s>{fmtRp(plan.normal_price)}</s>{/if}
                      {fmtRp(plan.price)}
                    </button>
                    {#if offerActive}<span class="trial-offer">Harga khusus sampai {fmtWib(plan.offer_expires_at)}</span>{/if}
                  </div>
                </div>
              </div>
            {:else if invitation.status === 'active'}
              <div class="status-alert-content">
                <span class="alert-icon"><Icon name="party" size={20} /></span>
                <div>
                  <strong>{plan?.phase === 'paid' ? 'Status: Aktif selamanya' : 'Status: Aktif! (Dunia 3D Sudah Terbit)'}</strong>
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
                <Icon name="copy" size={16} /> Salin Link
              </button>
               {#if invitation.status === 'active'}
               <a class="ghost-btn-sm" href={invitation.public_url} target="_blank" rel="noreferrer">
                 <Icon name="external" size={16} /> Buka Undangan
               </a>
               {/if}
               {#if invitation.status === 'active'}
               <button type="button" class="ghost-btn-sm" onclick={() => (showQrModal = true)}>
                 <Icon name="phone" size={16} /> QR Code
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
            <Icon name="invite" /> Detail Undangan
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
            <Icon name="guestbook" /> Buku Tamu {#if myGuestbook?.stats.total}<span class="tab-badge">{myGuestbook.stats.total}</span>{/if}
          </button>

          <button
            type="button"
            class="tab-btn"
            class:active={activeTab === 'kirim'}
            onclick={() => (activeTab = 'kirim')}
          >
            <Icon name="send" /> Kirim Undangan
          </button>

          <button
            type="button"
            class="tab-btn"
            class:active={activeTab === 'pengaturan'}
            onclick={() => (activeTab = 'pengaturan')}
          >
            <Icon name="palette" /> Tema
          </button>

          <button
            type="button"
            class="tab-btn"
            class:active={activeTab === 'pembayaran'}
            onclick={() => (activeTab = 'pembayaran')}
          >
            <Icon name="payment" /> Pembayaran
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
                <Icon name="rings" size={16} /> Data Mempelai
              </button>
              <button
                type="button"
                class="sub-tab-btn relative"
                class:active={editSubTab === 'acara'}
                onclick={() => (editSubTab = 'acara')}
              >
                <Icon name="calendar" size={16} /> Detail Acara &amp; Lokasi
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
                <Icon name="amplop" size={16} /> Amplop Digital &amp; Bank
              </button>
              <button
                type="button"
                class="sub-tab-btn"
                class:active={editSubTab === 'galeri'}
                onclick={() => (editSubTab = 'galeri')}
              >
                <Icon name="gallery" size={16} /> Galeri Foto 3D
              </button>
              <button
                type="button"
                class="sub-tab-btn"
                class:active={editSubTab === 'quote'}
                onclick={() => (editSubTab = 'quote')}
              >
                <Icon name="quote" size={16} /> Quote &amp; Pesan
              </button>
              <button
                type="button"
                class="sub-tab-btn"
                class:active={editSubTab === 'musik'}
                onclick={() => (editSubTab = 'musik')}
              >
                <Icon name="music" size={16} /> Musik
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
                    {#if savingConfig}Menyimpan...{:else}<Icon name="save" /> Simpan Perubahan{/if}
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

        <!-- Tab 5: Pembayaran -->
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

         {:else if activeTab === 'kirim'}
           <InvitationSender {invitation} {myConfig} />

         <!-- Tab 5: Pengaturan -->
        {:else if activeTab === 'pengaturan'}
          {@const is3d = myConfig?.preset !== '2d_garden'}
          <div class="workspace-panel tema-panel">
            <section class="tema-section">
              <h4 class="tema-label">Dunia Undangan</h4>
              <div class="tema-seg" role="radiogroup" aria-label="Pilih dunia undangan">
                {#each [
                  { id: '3d_summer', label: 'Dunia 3D', icon: 'sparkle' },
                  { id: '2d_garden', label: 'Pixel 2D', icon: 'garden' },
                ] as const as opt (opt.id)}
                  {@const active = opt.id === '3d_summer' ? is3d : !is3d}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    class:active
                    disabled={savingConfig}
                    onclick={async () => {
                      if (!myConfig || active) return
                      myConfig.preset = opt.id
                      await saveConfig()
                    }}
                  >
                    <Icon name={opt.icon} size={18} /> {opt.label}
                  </button>
                {/each}
              </div>
            </section>

            {#if is3d}
              <section class="tema-section">
                <h4 class="tema-label">Venue 3D</h4>
                <div class="tema-grid" role="radiogroup" aria-label="Pilih venue dunia 3D">
                  {#each venueOptions as option (option.id)}
                    {@const active = (myConfig?.venue ?? 'garden') === option.id}
                    <button
                      type="button"
                      role="radio"
                      aria-checked={active}
                      class="tema-card"
                      class:active
                      disabled={savingConfig}
                      onclick={() => switchVenue(option.id)}
                    >
                      <img src={option.thumbnail} alt="" loading="lazy" />
                      <span class="tema-card-foot">{resolveVenue(option.id).label}{#if active}<span class="tema-check"><Icon name="check" size={18} /></span>{/if}</span>
                    </button>
                  {/each}
                </div>
                {#if venueMsg}
                  <p class="venue-switch-msg">{venueMsg} {#if venueMsg.startsWith('✓')}· <a href={invitation.public_url} target="_blank" rel="noreferrer">Lihat undangan ↗</a>{/if}</p>
                {/if}
              </section>
            {:else}
              <section class="tema-section">
                <h4 class="tema-label">Tampilan 2D</h4>
                <div class="tema-grid">
                  <div class="tema-card active">
                    <img src="/media/designs/2d.webp" alt="Pratinjau undangan Pixel 2D" loading="lazy" />
                    <span class="tema-card-foot">Pixel Garden<span class="tema-check"><Icon name="check" size={18} /></span></span>
                  </div>
                </div>
              </section>

              <section class="tema-section">
                <h4 class="tema-label">Gaya busana karakter</h4>
                <p class="tema-hint">Berlaku untuk pengantin, penerima tamu, tamu, dan latar Akad &amp; Resepsi.</p>
                <div class="tema-grid" role="radiogroup" aria-label="Pilih gaya busana karakter">
                  {#each characterStyleOptions as option (option.id)}
                    {@const active = (myConfig?.character_style ?? 'umum') === option.id}
                    <button
                      type="button"
                      role="radio"
                      aria-checked={active}
                      class="tema-card tema-card--busana"
                      class:active
                      disabled={savingConfig}
                      onclick={() => switchCharacterStyle(option.id)}
                    >
                      <img src={option.thumbnail} alt="" loading="lazy" />
                      <span class="tema-card-foot">{option.label}{#if active}<span class="tema-check"><Icon name="check" size={18} /></span>{/if}</span>
                    </button>
                  {/each}
                </div>
                {#if styleMsg}
                  <p class="venue-switch-msg">{styleMsg} {#if styleMsg.startsWith('✓')}· <a href={invitation.public_url} target="_blank" rel="noreferrer">Lihat undangan ↗</a>{/if}</p>
                {/if}
              </section>
            {/if}

            <div class="tema-info-grid">
              <div class="tema-info-card">
                <h4 class="tema-label"><Icon name="globe" size={16} /> Subdomain</h4>
                {#if !editingSlug}
                  <div class="tema-info-row">
                    <code>{invitation.slug}.marryme.web.id</code>
                    <span class="badge-inline" data-status={invitation.status}>{statusLabel(invitation.status)}</span>
                  </div>
                  <button type="button" class="ghost-btn-sm" onclick={startEditSlug}>
                    <Icon name="edit" size={15} /> Ubah
                  </button>
                  {#if slugSuccessMsg}<span class="tema-ok">✓ {slugSuccessMsg}</span>{/if}
                {:else}
                  <div class="tema-slug-input">
                    <input id="new-subdomain-input" bind:value={newSlugInput} placeholder="nama-pasangan" aria-label="Subdomain baru" />
                    <span>.marryme.web.id</span>
                  </div>
                  <div class="tema-actions">
                    <button type="button" class="primary-btn-sm" disabled={savingSlug} onclick={handleSaveSlug}>
                      {savingSlug ? 'Menyimpan...' : 'Simpan'}
                    </button>
                    <button type="button" class="ghost-btn-sm" disabled={savingSlug} onclick={() => (editingSlug = false)}>Batal</button>
                  </div>
                  {#if slugError}<p class="tema-err"><Icon name="alert" size={14} /> {slugError}</p>{/if}
                {/if}
              </div>

              <div class="tema-info-card">
                <h4 class="tema-label"><Icon name="groom" size={16} /> Akun</h4>
                <div class="tema-info-row">
                  <strong>{user.displayName}</strong>
                </div>
                <p class="tema-muted">{user.email || '-'}</p>
                <button type="button" class="ghost-btn-sm" onclick={() => void handleLogout()}>Keluar</button>
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

  <!-- Footer (dashboard; landing punya footer sendiri) -->
  {#if user}
  <footer class="site-footer">
    <div class="footer-inner">
      <p><span>MarryMe</span> by Jago Institute</p>
      <p class="footer-year">2026</p>
    </div>
  </footer>
  {/if}

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
        <button type="button" class="primary-btn-sm" onclick={copyLink}><Icon name="copy" size={16} /> Salin Link</button>
              {#if invitation.status === 'active'}
              <a
          class="ghost-btn-sm"
          href="https://api.qrserver.com/v1/create-qr-code/?size=500x500&data={encodeURIComponent(invitation.public_url)}"
          target="_blank"
          download="QR_{invitation.slug}.png"
        >
          <Icon name="download" size={16} /> Unduh Gambar QR
              </a>
              {/if}
      </div>
    </div>
  </div>
{/if}
