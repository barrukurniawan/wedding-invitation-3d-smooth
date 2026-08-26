<script lang="ts">
  import { onMount } from 'svelte'
  import {
    activateInvitation,
    ApiError,
    deleteAdminGuestbookEntry,
    getAdminConfig,
    getAdminGuestbook,
    getAdminInvitations,
    getAdminSession,
    getAdminStats,
    login as createAdminSession,
    logout,
    rejectInvitation,
    updateAdminConfig,
    uploadAdminPhoto,
    uploadAdminMusic,
    type AdminInvitation,
    type GuestbookEntry,
    type GuestbookStats,
    type WeddingConfig,
  } from '$lib/api-client'
  import { inputClass } from '$lib/components/admin/styles'
  import MonitoringTab from '$lib/components/admin/MonitoringTab.svelte'
  import VerificationTab from '$lib/components/admin/VerificationTab.svelte'
  import CoupleTab from '$lib/components/admin/CoupleTab.svelte'
  import EventsTab from '$lib/components/admin/EventsTab.svelte'
  import PaymentTab from '$lib/components/admin/PaymentTab.svelte'
  import LocationTab from '$lib/components/admin/LocationTab.svelte'
  import GalleryTab from '$lib/components/admin/GalleryTab.svelte'
  import GuestbookTab from '$lib/components/admin/GuestbookTab.svelte'
  import StatsTab from '$lib/components/admin/StatsTab.svelte'
  import SecurityTab from '$lib/components/admin/SecurityTab.svelte'

  const TABS = [
    ['monitoring', 'Monitoring'],
    ['verifikasi', 'Verifikasi Undangan'],
    ['pengantin', 'Pengantin'],
    ['acara', 'Acara'],
    ['pembayaran', 'Pembayaran'],
    ['lokasi', 'Lokasi'],
    ['galeri', 'Galeri'],
    ['ucapan', 'Ucapan'],
    ['statistik', 'Statistik'],
    ['keamanan', 'Keamanan'],
  ] as const

  type TabId = (typeof TABS)[number][0]

  let loggedIn = $state(false)
  let loadingSession = $state(true)
  let usernameInput = $state('admin')
  let passwordInput = $state('')
  let loginError = $state('')

  let config = $state<WeddingConfig | null>(null)
  let saving = $state(false)
  let savedMsg = $state('')
  let uploading = $state(false)

  let entries = $state<GuestbookEntry[]>([])
  let adminInvitations = $state<AdminInvitation[]>([])
  let loadingInvitations = $state(false)
  let verifyingId = $state<number | null>(null)
  let activeTab = $state<TabId>('monitoring')

  let stats = $state<GuestbookStats>({ total: 0, hadir: 0, ragu: 0, tidakHadir: 0 })

  onMount(async () => {
    try {
      await getAdminSession()
      loggedIn = true
      await loadDashboard()
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) loginError = 'Server admin tidak dapat dihubungi.'
    } finally {
      loadingSession = false
    }
  })

  async function login() {
    loginError = ''
    try {
      await createAdminSession(usernameInput, passwordInput)
      passwordInput = ''
      loggedIn = true
      await loadDashboard()
    } catch (error) {
      loginError = error instanceof ApiError ? error.message : 'Login gagal. Coba lagi.'
    }
  }

  async function loadDashboard() {
    const [loadedConfig] = await Promise.all([loadConfig(), loadEntries(), loadStats(), loadAdminInvitations()])
    config = loadedConfig
  }

  async function loadAdminInvitations() {
    loadingInvitations = true
    try {
      adminInvitations = await getAdminInvitations()
    } catch {
      adminInvitations = []
    } finally {
      loadingInvitations = false
    }
  }

  async function handleActivate(id: number) {
    if (!confirm('Aktifkan undangan ini?')) return
    verifyingId = id
    try {
      await activateInvitation(id)
      await loadAdminInvitations()
    } catch (error) {
      savedMsg = error instanceof ApiError ? `Gagal: ${error.message}` : 'Gagal mengaktifkan'
    } finally {
      verifyingId = null
    }
  }

  async function handleReject(id: number) {
    const reason = window.prompt('Alasan penolakan pembayaran:')?.trim()
    if (!reason) return
    verifyingId = id
    try {
      await rejectInvitation(id, reason)
      await loadAdminInvitations()
    } catch (error) {
      savedMsg = error instanceof ApiError ? `Gagal: ${error.message}` : 'Gagal menolak'
    } finally {
      verifyingId = null
    }
  }

  async function loadConfig() {
    return getAdminConfig()
  }

  async function save() {
    if (!config) return
    saving = true
    let ok = false
    try {
      config = await updateAdminConfig(config)
      ok = true
    } catch (error) {
      savedMsg = error instanceof ApiError ? `Gagal: ${error.message}` : 'Gagal menyimpan'
    }
    saving = false
    if (ok) savedMsg = 'Tersimpan!'
    setTimeout(() => (savedMsg = ''), 3000)
  }

  async function loadEntries() {
    const page = await getAdminGuestbook()
    entries = page.items
  }

  async function loadStats() {
    stats = await getAdminStats()
  }

  async function removeEntry(id: string) {
    if (!confirm('Hapus ucapan ini secara permanen?')) return
    try {
      await deleteAdminGuestbookEntry(id)
      await Promise.all([loadEntries(), loadStats()])
    } catch (error) {
      savedMsg = error instanceof ApiError ? `Gagal: ${error.message}` : 'Gagal menghapus ucapan'
    }
  }

  async function signOut() {
    try {
      await logout()
    } finally {
      loggedIn = false
      config = null
      entries = []
      passwordInput = ''
    }
  }

  function removePhoto(idx: number) {
    if (!config) return
    config.gallery_photos = config.gallery_photos.filter((_, i) => i !== idx)
  }

  async function handleFileUpload(e: Event, type: 'photo' | 'music'): Promise<string | null> {
    const input = e.target as HTMLInputElement
    if (!input.files || input.files.length === 0) return null
    uploading = true
    savedMsg = ''
    try {
      if (type === 'photo') {
        const res = await uploadAdminPhoto(input.files[0])
        return res.photo_url
      } else {
        const res = await uploadAdminMusic(input.files[0])
        if (config) config.bgm_title = res.bgm_title
        return res.bgm_url
      }
    } catch (error) {
      savedMsg = error instanceof ApiError ? `Gagal upload: ${error.message}` : 'Gagal mengunggah file'
      return null
    } finally {
      uploading = false
      input.value = '' // reset input
    }
  }

  async function uploadMainPhoto(e: Event) {
    const url = await handleFileUpload(e, 'photo')
    if (url && config) config.wedding_photo = url
  }

  async function uploadQrisPhoto(e: Event) {
    const url = await handleFileUpload(e, 'photo')
    if (url && config) config.qris_image = url
  }

  async function uploadGalleryPhoto(e: Event) {
    const url = await handleFileUpload(e, 'photo')
    if (url && config) config.gallery_photos = [...(config.gallery_photos || []), url]
  }

  async function uploadBgm(e: Event) {
    const url = await handleFileUpload(e, 'music')
    if (url && config) config.bgm_url = url
  }

  const hasSaveButton = $derived(!['monitoring', 'verifikasi', 'ucapan', 'statistik', 'keamanan'].includes(activeTab))
</script>

<svelte:head><title>Admin — Wedding Dashboard</title></svelte:head>

<div class="min-h-screen bg-stone-950 p-4 text-stone-100 md:p-6">
  <div class="mx-auto max-w-3xl">
    {#if loadingSession}
      <p class="mt-20 text-center text-stone-500">Memuat sesi admin...</p>
    {:else if !loggedIn}
      <!-- Login -->
      <div class="mx-auto mt-20 max-w-sm rounded-2xl border border-stone-800 bg-stone-900 p-6">
        <h1 class="text-xl font-bold text-rose-400">Admin Dashboard</h1>
        <p class="mt-1 text-xs text-stone-500">Masukkan password untuk mengelola undangan</p>
        <input bind:value={usernameInput} autocomplete="username" placeholder="Username" class="mt-4 {inputClass}" onkeydown={(e) => e.key === 'Enter' && login()} />
        <input type="password" bind:value={passwordInput} autocomplete="current-password" placeholder="Password" class="mt-3 {inputClass}" onkeydown={(e) => e.key === 'Enter' && login()} />
        {#if loginError}<p class="mt-2 text-xs text-red-400">{loginError}</p>{/if}
        <button class="mt-4 w-full rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-500" onclick={login}>Masuk</button>
      </div>
    {:else if config}
      <!-- Dashboard -->
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold text-rose-400">Admin Dashboard</h1>
        <button class="rounded-lg bg-stone-800 px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200" onclick={signOut}>Keluar</button>
      </div>

      <!-- Tabs -->
      <div class="mt-4 flex flex-wrap gap-2">
        {#each TABS as [id, label] (id)}
          <button class="rounded-lg px-3 py-1.5 text-xs font-medium transition {activeTab === id ? 'bg-rose-600 text-white' : 'bg-stone-900 text-stone-400 hover:text-stone-200'}" onclick={() => (activeTab = id)}>{label}</button>
        {/each}
      </div>

      <!-- Content -->
      <div class="mt-6 rounded-2xl border border-stone-800 bg-stone-900 p-5">
        {#if activeTab === 'monitoring'}
          <MonitoringTab />
        {:else if activeTab === 'verifikasi'}
          <VerificationTab invitations={adminInvitations} loading={loadingInvitations} verifyingId={verifyingId} onActivate={handleActivate} onReject={handleReject} onRefresh={loadAdminInvitations} />
        {:else if activeTab === 'pengantin'}
          <CoupleTab {config} onUploadPhoto={uploadMainPhoto} />
        {:else if activeTab === 'acara'}
          <EventsTab {config} onUploadMusic={uploadBgm} />
        {:else if activeTab === 'pembayaran'}
          <PaymentTab {config} onUploadQris={uploadQrisPhoto} />
        {:else if activeTab === 'lokasi'}
          <LocationTab {config} />
        {:else if activeTab === 'galeri'}
          <GalleryTab {config} onUploadPhoto={uploadGalleryPhoto} onRemovePhoto={removePhoto} />
        {:else if activeTab === 'ucapan'}
          <GuestbookTab {entries} onRefresh={() => Promise.all([loadEntries(), loadStats()])} onDelete={removeEntry} />
        {:else if activeTab === 'statistik'}
          <StatsTab {stats} />
        {:else if activeTab === 'keamanan'}
          <SecurityTab />
        {/if}
      </div>

      <!-- Save button -->
      {#if hasSaveButton}
        <div class="mt-4 flex items-center gap-3">
          <button class="rounded-lg bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50" onclick={save} disabled={saving || uploading}>
            {saving ? 'Menyimpan...' : uploading ? 'Mengunggah...' : 'Simpan Perubahan'}
          </button>
          {#if savedMsg}<span class="text-sm {savedMsg === 'Tersimpan!' ? 'text-green-400' : 'text-red-400'}">{savedMsg}</span>{/if}
        </div>
      {:else if savedMsg && (activeTab === 'verifikasi')}
        <p class="mt-4 text-sm text-red-400">{savedMsg}</p>
      {/if}
    {:else}
      <p class="mt-20 text-center text-stone-500">Memuat...</p>
    {/if}
  </div>
</div>
