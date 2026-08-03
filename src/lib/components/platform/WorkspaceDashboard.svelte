<script lang="ts">
  import { onMount } from 'svelte'
  import './workspace.css'
  import {
    ApiError,
    createInvitation,
    getMyConfig,
    getMyGuestbook,
    getMyInvitation,
    getUserSession,
    logoutUser,
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
  import GuestbookManager from './dashboard/GuestbookManager.svelte'
  import PaymentManager from './dashboard/PaymentManager.svelte'
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

  // Workspace Navigation & Sub-tabs
  let activeTab = $state<'edit' | 'tamu' | 'pembayaran' | 'preview' | 'pengaturan'>('edit')
  let editSubTab = $state<'mempelai' | 'acara' | 'amplop' | 'lokasi' | 'galeri' | 'quote'>('mempelai')

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
    void bootstrap()
  })

  function statusLabel(status: string) {
    if (status === 'active') return 'Aktif'
    if (status === 'draft') return 'Draft'
    if (status === 'pending_verification') return 'Menunggu Verifikasi Admin'
    if (status === 'suspended') return 'Ditangguhkan'
    if (status === 'expired') return 'Berakhir'
    return status
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
    } catch (err) {
      user = null
      invitation = null
      if (!(err instanceof ApiError) || err.status !== 401) {
        error = 'Sesi akun tidak valid.'
      }
      window.location.href = '/'
      return
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
      window.location.href = '/'
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
    targetSubTab?: 'mempelai' | 'acara' | 'amplop' | 'lokasi' | 'galeri' | 'quote'
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
  <title>Dashboard Pengelola | MarryMe</title>
  <meta name="description" content="Kelola dan publikasikan dunia 3D undangan pernikahan kalian." />
</svelte:head>

<main class="workspace-page">
  <!-- Topbar Header -->
  <header class="topbar">
    <a class="wordmark" href="/account" aria-label="MarryMe Dashboard">Marry<span>Me</span></a>
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

  {#if loading}
    <div class="workspace" style="display: grid; place-items: center; min-height: 50vh;">
      <p style="color: var(--muted); font-size: 1rem;">Memuat workspace pengelola...</p>
    </div>
  {:else}
    <!-- Logged In Workspace Section -->
    <section class="workspace" aria-labelledby="owner-title">
      {#if error}<p class="owner-error" role="alert">{error}</p>{/if}

      {#if invitation && user}
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
            {#if invitation.status === 'draft'}
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
            <p class="control-label">Link Undangan Kamu</p>
            <h2 class="subdomain-url"><code>{invitation.public_url.replace(/^https?:\/\//, '')}</code></h2>
            <p class="subdomain-note">Alamat link ini sudah dipesan eksklusif untuk pernikahan kalian.</p>

            <div class="link-actions-row">
              <button type="button" class="primary-btn-sm" onclick={copyLink}>
                📋 Salin Link
              </button>
              <a class="ghost-btn-sm" href={invitation.public_url} target="_blank" rel="noreferrer">
                ↗ Buka Undangan
              </a>
              <button type="button" class="ghost-btn-sm" onclick={() => (showQrModal = true)}>
                📱 QR Code
              </button>
              <a
                class="wa-btn-sm"
                href={`https://wa.me/?text=${encodeURIComponent(`Hai! Kami mengundang kamu ke pernikahan${myConfig?.bride_name && myConfig?.groom_name ? ` ${myConfig.bride_name} & ${myConfig.groom_name}` : ''}. 💍\n\nBuka undangan 3D kami di sini:\n${invitation.public_url}\n\nKami tunggu kehadiranmu! 🎊`)}`}
                target="_blank"
                rel="noreferrer"
              >
                📲 Bagikan via WhatsApp
              </a>
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
        </nav>

        <!-- Tab 1: Detail Undangan Editor -->
        {#if activeTab === 'edit'}
          <div class="workspace-panel">
            <!-- Sub-tab Bar -->
            <div class="editor-subtabs">
              <button
                type="button"
                class="subtab-btn"
                class:active={editSubTab === 'mempelai'}
                onclick={() => (editSubTab = 'mempelai')}
              >
                Data Mempelai
              </button>
              <button
                type="button"
                class="subtab-btn"
                class:active={editSubTab === 'acara'}
                onclick={() => (editSubTab = 'acara')}
              >
                Detail Acara
              </button>
              <button
                type="button"
                class="subtab-btn"
                class:active={editSubTab === 'amplop'}
                onclick={() => (editSubTab = 'amplop')}
              >
                Amplop Digital &amp; Bank
              </button>
              <button
                type="button"
                class="subtab-btn"
                class:active={editSubTab === 'lokasi'}
                onclick={() => (editSubTab = 'lokasi')}
              >
                Lokasi Venue
              </button>
              <button
                type="button"
                class="subtab-btn"
                class:active={editSubTab === 'galeri'}
                onclick={() => (editSubTab = 'galeri')}
              >
                Galeri Foto 3D
              </button>
              <button
                type="button"
                class="subtab-btn"
                class:active={editSubTab === 'quote'}
                onclick={() => (editSubTab = 'quote')}
              >
                Quote &amp; Pesan
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
                {/if}

                <!-- Save Action Footer Bar -->
                <div class="config-save-bar">
                  <button type="submit" class="primary-btn-sm" disabled={savingConfig}>
                    {savingConfig ? 'Menyimpan...' : '💾 Simpan Perubahan'}
                  </button>
                  {#if configSavedMsg}
                    <span class="saved-msg" class:error-msg={configSavedMsg.startsWith('Gagal')}>
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
            onStatusChange={(newStatus) => { invitation = { ...invitation, status: newStatus } as typeof invitation }}
          />

        <!-- Tab 4: Preview -->
        {:else if activeTab === 'preview'}
          <div class="workspace-panel">
            <h3>Pratinjau Dunia 3D Undangan</h3>
            <p class="section-desc">Lihat secara langsung bagaimana dunia 3D pernikahan kalian ditampilkan kepada tamu.</p>

            <div class="preview-link-box" style="margin-bottom: 20px;">
              <a class="primary-btn-sm" href={invitation.public_url} target="_blank" rel="noreferrer">
                ↗ Buka {invitation.slug}.marryme.web.id
              </a>
            </div>

            <div class="preview-iframe-wrapper" style="border: 1px solid var(--line); border-radius: 14px; overflow: hidden; height: 600px;">
              <iframe src={invitation.public_url} title="Preview Dunia 3D Undangan" style="width: 100%; height: 100%; border: none;"></iframe>
            </div>
          </div>

        <!-- Tab 5: Pengaturan -->
        {:else if activeTab === 'pengaturan'}
          <div class="workspace-panel">
            <h3>Pengaturan Undangan &amp; Akun</h3>
            <p class="section-desc">Informasi teknis mengenai alamat domain dan sesi pengelola.</p>

            <div class="grid-2">
              <div class="form-section">
                <h3>Status Subdomain</h3>
                <p>Alamat: <code>{invitation.slug}.marryme.web.id</code></p>
                <p>Status: <strong class="badge" data-status={invitation.status}>{statusLabel(invitation.status)}</strong></p>
                <p>Zona Waktu: <code>{invitation.timezone}</code></p>
              </div>
              <div class="form-section">
                <h3>Akun Pengelola</h3>
                <p>Nama: <strong>{user.displayName}</strong></p>
                <p>Email: <code>{user.email || '-'}</code></p>
                <button type="button" class="ghost-btn-sm" style="margin-top: 12px;" onclick={() => void handleLogout()}>Keluar dari Akun</button>
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
  <footer style="margin-top: auto; padding: 32px 24px; text-align: center; border-top: 1px solid var(--line); color: var(--muted); font-size: 0.85rem;">
    <div>
      <p style="margin: 0;"><strong>MarryMe</strong> by Jago Institute — 2026</p>
    </div>
  </footer>
</main>

<!-- QR Code Modal -->
{#if showQrModal && invitation}
  <div style="position: fixed; inset: 0; z-index: 9999; display: grid; place-items: center; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);" role="dialog" aria-modal="true" aria-labelledby="qr-modal-title">
    <div
      style="position: absolute; inset: 0;"
      role="button"
      tabindex="0"
      aria-label="Tutup modal"
      onclick={() => (showQrModal = false)}
      onkeydown={(e) => { if (e.key === 'Escape') showQrModal = false }}
    ></div>
    <div style="position: relative; z-index: 1; background: #fff; border-radius: 18px; padding: 28px; max-width: 400px; width: 90%; box-shadow: 0 20px 50px rgba(0,0,0,0.2);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <h3 id="qr-modal-title" style="margin: 0; font-family: 'Playfair Display', serif;">QR Code Undangan</h3>
        <button type="button" style="background: none; border: none; font-size: 1.2rem; cursor: pointer;" onclick={() => (showQrModal = false)}>✕</button>
      </div>
      <div>
        <p style="font-size: 0.85rem; color: var(--muted); margin-bottom: 16px;">QR Code siap cetak untuk kartu undangan, meja penerima tamu, atau media cetak lainnya.</p>
        <div style="display: flex; justify-content: center; margin-bottom: 16px;">
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={encodeURIComponent(invitation.public_url)}"
            alt="QR Code {invitation.slug}"
            style="width: 200px; height: 200px; border-radius: 12px; border: 1px solid var(--line);"
          />
        </div>
        <p style="text-align: center; font-size: 0.85rem; margin-bottom: 20px;"><code>{invitation.public_url}</code></p>
      </div>
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button type="button" class="primary-btn-sm" onclick={copyLink}>📋 Salin Link</button>
        <a
          class="ghost-btn-sm"
          href="https://api.qrserver.com/v1/create-qr-code/?size=500x500&data={encodeURIComponent(invitation.public_url)}"
          target="_blank"
          download="QR_{invitation.slug}.png"
        >
          💾 Unduh QR
        </a>
      </div>
    </div>
  </div>
{/if}
