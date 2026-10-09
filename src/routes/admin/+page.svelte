<script lang="ts">
  import { onMount } from 'svelte'
  import {
    ApiError,
    deleteAdminGuestbookEntry,
    getAdminConfig,
    getAdminGuestbook,
    getAdminSession,
    getAdminStats,
    login as createAdminSession,
    logout,
    updateAdminConfig,
    uploadAdminPhoto,
    uploadAdminMusic,
    type GuestbookEntry,
    type GuestbookStats,
    type WeddingConfig,
  } from '$lib/api-client'
  import '$lib/components/admin/admin.css'
  import AdminShell from '$lib/components/admin/ui/AdminShell.svelte'
  import Icon from '$lib/components/admin/ui/Icon.svelte'
  import MonitoringTab from '$lib/components/admin/MonitoringTab.svelte'
  import SubdomainsTab from '$lib/components/admin/SubdomainsTab.svelte'
  import TrafficTab from '$lib/components/admin/TrafficTab.svelte'
  import CoupleTab from '$lib/components/admin/CoupleTab.svelte'
  import EventsTab from '$lib/components/admin/EventsTab.svelte'
  import PaymentTab from '$lib/components/admin/PaymentTab.svelte'
  import LocationTab from '$lib/components/admin/LocationTab.svelte'
  import GalleryTab from '$lib/components/admin/GalleryTab.svelte'
  import GuestbookTab from '$lib/components/admin/GuestbookTab.svelte'
  import StatsTab from '$lib/components/admin/StatsTab.svelte'
  import SecurityTab from '$lib/components/admin/SecurityTab.svelte'

  const MENUS = [
    { id: 'ringkasan', label: 'Ringkasan', icon: 'grid' },
    { id: 'subdomain', label: 'Subdomain', icon: 'globe' },
    { id: 'trafik', label: 'Trafik', icon: 'chart' },
    { id: 'konten', label: 'Konten Demo', icon: 'edit' },
    { id: 'ucapan', label: 'Ucapan', icon: 'message' },
    { id: 'keamanan', label: 'Keamanan', icon: 'shield' },
  ] as const

  // Konten Demo hanya mengedit undangan #1 (lihat server/routes/admin.js).
  const CONTENT_TABS = [
    ['pengantin', 'Pengantin'],
    ['acara', 'Acara & Musik'],
    ['pembayaran', 'Amplop Digital'],
    ['lokasi', 'Lokasi'],
    ['galeri', 'Galeri'],
  ] as const

  const SUBTITLES: Record<MenuId, string> = {
    ringkasan: 'Pantau pertumbuhan platform, verifikasi, dan RSVP dalam satu layar.',
    subdomain: 'Semua subdomain terdaftar, pemiliknya, trafik, dan verifikasi pembayaran.',
    trafik: 'Kunjungan ke marryme.web.id dan seluruh subdomain undangan.',
    konten: 'Ubah isi undangan demo (#1) yang dipakai sebagai contoh.',
    ucapan: 'Ucapan dan RSVP tamu di undangan demo (#1).',
    keamanan: 'Kelola akses akun admin.',
  }

  type MenuId = (typeof MENUS)[number]['id']
  type ContentTabId = (typeof CONTENT_TABS)[number][0]

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
  let activeTab = $state<MenuId>('ringkasan')
  let contentTab = $state<ContentTabId>('pengantin')
  let refreshKey = $state(0)
  let refreshing = $state(false)

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
    config = await loadConfig()
    await loadMenuData(activeTab)
  }

  function loadMenuData(menu: MenuId, force = false) {
    if (menu === 'ucapan' && (force || entries.length === 0)) return Promise.all([loadEntries(), loadStats()])
  }

  function handleTabChange(menu: MenuId) {
    activeTab = menu
    savedMsg = ''
    void loadMenuData(menu)
  }

  async function refresh() {
    refreshing = true
    try {
      refreshKey++
      await Promise.all([loadMenuData(activeTab, true), activeTab === 'konten' ? loadConfig().then((c) => (config = c)) : null])
    } finally {
      refreshing = false
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

</script>

<svelte:head><title>Admin — MarryMe</title></svelte:head>

<div class="adm">
  {#if loadingSession}
    <p class="adm-empty" style="margin-top: 20vh">Memuat sesi admin...</p>
  {:else if !loggedIn}
    <div class="adm-login">
      <form
        class="adm-login-card"
        onsubmit={(event) => {
          event.preventDefault()
          void login()
        }}
      >
        <div class="adm-logo" style="display: inline-flex">
          <span class="adm-logo-mark">M</span>
          <span>MarryMe <small>Admin</small></span>
        </div>
        <h1>Masuk ke Admin</h1>
        <p>Kelola subdomain, verifikasi pembayaran, dan pantau trafik platform.</p>
        <div class="adm-field">
          <label class="adm-label" for="admin-username">Username</label>
          <input id="admin-username" bind:value={usernameInput} autocomplete="username" class="adm-input" />
        </div>
        <div class="adm-field" style="margin-top: 12px">
          <label class="adm-label" for="admin-password">Password</label>
          <input id="admin-password" type="password" bind:value={passwordInput} autocomplete="current-password" class="adm-input" />
        </div>
        {#if loginError}<p class="adm-error" style="margin-top: 10px">{loginError}</p>{/if}
        <button type="submit" class="adm-btn" style="width: 100%; margin-top: 18px">Masuk</button>
      </form>
    </div>
  {:else if config}
    <AdminShell
      menus={MENUS}
      active={activeTab}
      onSelect={handleTabChange}
      subtitle={SUBTITLES[activeTab]}
      {refreshing}
      onRefresh={refresh}
      onSignOut={signOut}
    >
      <section class="adm-section">
        {#key refreshKey}
          {#if activeTab === 'ringkasan'}
            <MonitoringTab onNavigate={handleTabChange} />
          {:else if activeTab === 'subdomain'}
            <SubdomainsTab />
          {:else if activeTab === 'trafik'}
            <TrafficTab />
          {:else if activeTab === 'konten'}
            <div class="adm-banner">
              <Icon name="edit" size={16} />
              <span>Mengedit <strong>undangan demo (#1)</strong>. Perubahan di sini tidak memengaruhi undangan milik pasangan lain.</span>
            </div>
            <div class="adm-subtabs" style="margin-top: 14px">
              {#each CONTENT_TABS as [id, label] (id)}
                <button type="button" class="adm-chip" class:active={contentTab === id} onclick={() => (contentTab = id)}>{label}</button>
              {/each}
            </div>
            <div class="adm-card" style="margin-top: 14px">
              {#if contentTab === 'pengantin'}
                <CoupleTab {config} onUploadPhoto={uploadMainPhoto} />
              {:else if contentTab === 'acara'}
                <EventsTab {config} onUploadMusic={uploadBgm} />
              {:else if contentTab === 'pembayaran'}
                <PaymentTab {config} onUploadQris={uploadQrisPhoto} />
              {:else if contentTab === 'lokasi'}
                <LocationTab {config} />
              {:else if contentTab === 'galeri'}
                <GalleryTab {config} onUploadPhoto={uploadGalleryPhoto} onRemovePhoto={removePhoto} />
              {/if}
            </div>
            <div class="adm-savebar">
              <span>
                {#if savedMsg}
                  <span class={savedMsg === 'Tersimpan!' ? 'msg-ok' : 'msg-err'}>{savedMsg === 'Tersimpan!' ? '✓ Perubahan tersimpan' : savedMsg}</span>
                {:else if uploading}
                  Mengunggah file...
                {:else}
                  Simpan setelah selesai mengubah isi undangan demo.
                {/if}
              </span>
              <button type="button" class="adm-btn" onclick={save} disabled={saving || uploading}>
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          {:else if activeTab === 'ucapan'}
            <div class="adm-card">
              <GuestbookTab {entries} onRefresh={() => Promise.all([loadEntries(), loadStats()])} onDelete={removeEntry} />
            </div>
            {#if savedMsg}<p class="adm-error" style="margin-top: 12px">{savedMsg}</p>{/if}
          {:else if activeTab === 'keamanan'}
            <div class="adm-card">
              <SecurityTab />
            </div>
          {/if}
        {/key}
      </section>
    </AdminShell>
  {:else}
    <p class="adm-empty" style="margin-top: 20vh">Memuat...</p>
  {/if}
</div>
