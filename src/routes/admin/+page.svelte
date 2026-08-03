<script lang="ts">
  import { onMount } from 'svelte'
  import {
    activateInvitation,
    ApiError,
    changeAdminPassword,
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
    type AdminInvitation,
    type GuestbookEntry,
    type GuestbookStats,
    type WeddingConfig,
  } from '$lib/api-client'

  let loggedIn = $state(false)
  let loadingSession = $state(true)
  let usernameInput = $state('admin')
  let passwordInput = $state('')
  let loginError = $state('')

  let config = $state<WeddingConfig | null>(null)
  let saving = $state(false)
  let savedMsg = $state('')

  let entries = $state<GuestbookEntry[]>([])
  let adminInvitations = $state<AdminInvitation[]>([])
  let loadingInvitations = $state(false)
  let verifyingId = $state<number | null>(null)
  let activeTab = $state<'verifikasi' | 'pengantin' | 'acara' | 'pembayaran' | 'lokasi' | 'galeri' | 'ucapan' | 'statistik' | 'keamanan'>('verifikasi')

  let stats = $state<GuestbookStats>({ total: 0, hadir: 0, ragu: 0, tidakHadir: 0 })
  let currentPassword = $state('')
  let newPassword = $state('')
  let passwordMsg = $state('')
  let changingPassword = $state(false)

  let newPhotoUrl = $state('')

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
    if (!confirm('Tolak pembayaran & kembalikan status ke draft?')) return
    verifyingId = id
    try {
      await rejectInvitation(id)
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

  async function changePassword() {
    passwordMsg = ''
    changingPassword = true
    try {
      await changeAdminPassword(currentPassword, newPassword)
      currentPassword = ''
      newPassword = ''
      passwordMsg = 'Password berhasil diubah.'
    } catch (error) {
      passwordMsg = error instanceof ApiError ? error.message : 'Password gagal diubah.'
    } finally {
      changingPassword = false
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

  function addPhoto() {
    if (!config || !newPhotoUrl) return
    config.gallery_photos = [...(config.gallery_photos || []), newPhotoUrl]
    newPhotoUrl = ''
  }

  function removePhoto(idx: number) {
    if (!config) return
    config.gallery_photos = config.gallery_photos.filter((_, i) => i !== idx)
  }

  function fmtDate(ts: string): string {
    if (!ts) return '-'
    return new Date(ts).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const inputClass = 'w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-rose-500'
  const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-400'
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
        {#each [['verifikasi','Verifikasi Undangan'],['pengantin','Pengantin'],['acara','Acara'],['pembayaran','Pembayaran'],['lokasi','Lokasi'],['galeri','Galeri'],['ucapan','Ucapan'],['statistik','Statistik'],['keamanan','Keamanan']] as [id,label]}
          <button class="rounded-lg px-3 py-1.5 text-xs font-medium transition {activeTab === id ? 'bg-rose-600 text-white' : 'bg-stone-900 text-stone-400 hover:text-stone-200'}" onclick={() => (activeTab = id as typeof activeTab)}>{label}</button>
        {/each}
      </div>

      <!-- Content -->
      <div class="mt-6 rounded-2xl border border-stone-800 bg-stone-900 p-5">
        {#if activeTab === 'verifikasi'}
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-rose-300">Verifikasi Undangan Pasangan</h2>
            <button class="text-xs text-rose-400 hover:text-rose-300" onclick={loadAdminInvitations}>Refresh</button>
          </div>
          {#if loadingInvitations}
            <p class="mt-4 text-center text-sm text-stone-500">Memuat daftar undangan...</p>
          {:else}
            <div class="mt-4 space-y-4">
              {#each adminInvitations as inv}
                <div class="rounded-xl border {inv.status === 'pending_verification' ? 'border-yellow-600/60 bg-yellow-950/20' : 'border-stone-800 bg-stone-950'} p-4">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="text-base font-bold text-white">{inv.slug}.marryme.web.id</span>
                        <span class="rounded-full px-2 py-0.5 text-xs font-semibold {inv.status === 'active' ? 'bg-green-800/60 text-green-300' : inv.status === 'pending_verification' ? 'bg-yellow-800/60 text-yellow-300' : 'bg-stone-800 text-stone-400'}">
                          {inv.status}
                        </span>
                      </div>
                      <p class="mt-1 text-xs text-stone-400">
                        Pemilik: <strong class="text-stone-200">{inv.user_display_name || inv.user_email || 'User'}</strong> ({inv.user_email})
                      </p>
                      {#if inv.bride_name || inv.groom_name}
                        <p class="text-xs text-rose-400 font-medium">Pasangan: {inv.bride_name || '—'} & {inv.groom_name || '—'}</p>
                      {/if}
                    </div>

                    <div class="flex items-center gap-2">
                      {#if inv.status !== 'active'}
                        <button
                          class="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500 disabled:opacity-50"
                          disabled={verifyingId === inv.id}
                          onclick={() => handleActivate(inv.id)}
                        >
                          Aktifkan
                        </button>
                      {/if}
                      {#if inv.status === 'pending_verification'}
                        <button
                          class="rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                          disabled={verifyingId === inv.id}
                          onclick={() => handleReject(inv.id)}
                        >
                          Tolak
                        </button>
                      {/if}
                    </div>
                  </div>

                  {#if inv.payment_proof_url}
                    <div class="mt-3 rounded-lg border border-stone-800 bg-stone-900 p-3">
                      <p class="text-xs text-stone-400">Bukti Transfer (dikirim {fmtDate(inv.payment_submitted_at || '')}):</p>
                      <a href={inv.payment_proof_url} target="_blank" rel="noreferrer" class="mt-2 inline-block">
                        <img src={inv.payment_proof_url} alt="Bukti Transfer {inv.slug}" class="max-h-48 max-w-full rounded-lg border border-stone-700 object-contain" />
                      </a>
                    </div>
                  {:else}
                    <p class="mt-2 text-xs text-stone-500 italic">Belum ada bukti transfer diunggah.</p>
                  {/if}
                </div>
              {:else}
                <p class="py-8 text-center text-sm text-stone-500">Belum ada pendaftaran undangan.</p>
              {/each}
            </div>
          {/if}

        {:else if activeTab === 'pengantin'}
          <h2 class="text-lg font-semibold text-rose-300">Data Pengantin</h2>
          <div class="mt-4 grid grid-cols-2 gap-4">
            <div><label for="bride-name" class={labelClass}>Nama Mempelai Wanita</label><input id="bride-name" bind:value={config.bride_name} class={inputClass} /></div>
            <div><label for="groom-name" class={labelClass}>Nama Mempelai Pria</label><input id="groom-name" bind:value={config.groom_name} class={inputClass} /></div>
            <div><label for="bride-parents" class={labelClass}>Orangtua Wanita</label><input id="bride-parents" bind:value={config.bride_parents} class={inputClass} /></div>
            <div><label for="groom-parents" class={labelClass}>Orangtua Pria</label><input id="groom-parents" bind:value={config.groom_parents} class={inputClass} /></div>
            <div class="col-span-2"><label for="wedding-photo" class={labelClass}>Foto Utama Pernikahan (URL)</label><input id="wedding-photo" bind:value={config.wedding_photo} class={inputClass} placeholder="https://..." /></div>
          </div>

        {:else if activeTab === 'acara'}
          <h2 class="text-lg font-semibold text-rose-300">Detail Acara</h2>
          <div class="mt-4 space-y-4">
            <div><label for="wedding-date" class={labelClass}>Tanggal Pernikahan (untuk countdown)</label><input id="wedding-date" type="datetime-local" bind:value={config.wedding_date} class={inputClass} /></div>
            <div class="rounded-xl border border-stone-800 bg-stone-950 p-4">
              <p class="text-xs font-semibold uppercase tracking-wider text-rose-300">Akad Nikah</p>
              <div class="mt-2 grid grid-cols-3 gap-3">
                <div><label for="akad-date" class={labelClass}>Tanggal</label><input id="akad-date" bind:value={config.akad_date} class={inputClass} /></div>
                <div><label for="akad-time" class={labelClass}>Waktu</label><input id="akad-time" bind:value={config.akad_time} class={inputClass} /></div>
                <div><label for="akad-location" class={labelClass}>Lokasi</label><input id="akad-location" bind:value={config.akad_location} class={inputClass} /></div>
              </div>
            </div>
            <div class="rounded-xl border border-stone-800 bg-stone-950 p-4">
              <p class="text-xs font-semibold uppercase tracking-wider text-rose-300">Resepsi</p>
              <div class="mt-2 grid grid-cols-3 gap-3">
                <div><label for="resepsi-date" class={labelClass}>Tanggal</label><input id="resepsi-date" bind:value={config.resepsi_date} class={inputClass} /></div>
                <div><label for="resepsi-time" class={labelClass}>Waktu</label><input id="resepsi-time" bind:value={config.resepsi_time} class={inputClass} /></div>
                <div><label for="resepsi-location" class={labelClass}>Lokasi</label><input id="resepsi-location" bind:value={config.resepsi_location} class={inputClass} /></div>
              </div>
            </div>
          </div>

        {:else if activeTab === 'pembayaran'}
          <h2 class="text-lg font-semibold text-rose-300">Pembayaran & Amplop</h2>
          <div class="mt-4 space-y-4">
            <div><label for="qris-image" class={labelClass}>QRIS Image (URL)</label><input id="qris-image" bind:value={config.qris_image} class={inputClass} placeholder="https://..." /></div>
            <div class="grid grid-cols-3 gap-4">
              <div><label for="bank-name" class={labelClass}>Bank</label><input id="bank-name" bind:value={config.bank_name} class={inputClass} /></div>
              <div><label for="bank-account" class={labelClass}>No. Rekening</label><input id="bank-account" bind:value={config.bank_account} class={inputClass} /></div>
              <div><label for="bank-holder" class={labelClass}>Atas Nama</label><input id="bank-holder" bind:value={config.bank_holder} class={inputClass} /></div>
            </div>
          </div>

        {:else if activeTab === 'lokasi'}
          <h2 class="text-lg font-semibold text-rose-300">Lokasi Venue</h2>
          <div class="mt-4 space-y-4">
            <div><label for="venue-address" class={labelClass}>Alamat Venue</label><input id="venue-address" bind:value={config.venue_address} class={inputClass} /></div>
            <div><label for="maps-url" class={labelClass}>Google Maps URL</label><input id="maps-url" bind:value={config.maps_url} class={inputClass} placeholder="https://maps.app.goo.gl/..." /></div>
          </div>

        {:else if activeTab === 'galeri'}
          <h2 class="text-lg font-semibold text-rose-300">Galeri Foto</h2>
          <div class="mt-4 flex gap-2">
            <input bind:value={newPhotoUrl} placeholder="URL foto..." class="flex-1 {inputClass}" />
            <button class="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500" onclick={addPhoto}>Tambah</button>
          </div>
          <div class="mt-4 grid grid-cols-3 gap-3">
            {#each config.gallery_photos as photo, i}
              <div class="relative">
                <img src={photo} alt="Foto {i+1}" class="aspect-square w-full rounded-lg object-cover" />
                <button class="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white hover:bg-red-600" onclick={() => removePhoto(i)}>✕</button>
              </div>
            {:else}
              <p class="col-span-3 text-center text-sm text-stone-500 py-8">Belum ada foto. Tambahkan URL foto di atas.</p>
            {/each}
          </div>

        {:else if activeTab === 'ucapan'}
          <h2 class="text-lg font-semibold text-rose-300">Ucapan Tamu</h2>
          <button class="mt-2 text-xs text-rose-400 hover:text-rose-300" onclick={() => Promise.all([loadEntries(), loadStats()])}>Refresh</button>
          <div class="mt-4 space-y-3 max-h-[500px] overflow-y-auto">
            {#each entries as entry}
              <div class="rounded-xl border border-stone-800 bg-stone-950 p-3">
                <div class="flex items-center justify-between">
                  <div>
                    <span class="text-sm font-semibold text-white">{entry.name}</span>
                    <span class="ml-2 rounded-full px-2 py-0.5 text-xs {entry.attendance === 'Hadir' ? 'bg-green-800/50 text-green-300' : entry.attendance === 'Ragu-ragu' ? 'bg-yellow-800/50 text-yellow-300' : 'bg-red-800/50 text-red-300'}">{entry.attendance}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-stone-600">{fmtDate(entry.created_at || '')}</span>
                    <button class="rounded-lg bg-red-800/50 px-2 py-1 text-xs text-red-300 hover:bg-red-700" onclick={() => removeEntry(entry.id!)}>Hapus</button>
                  </div>
                </div>
                <p class="mt-2 text-sm text-stone-300">{entry.message}</p>
              </div>
            {:else}
              <p class="text-center text-sm text-stone-500 py-8">Belum ada ucapan.</p>
            {/each}
          </div>

        {:else if activeTab === 'statistik'}
          <h2 class="text-lg font-semibold text-rose-300">Statistik</h2>
          <div class="mt-4 grid grid-cols-4 gap-4">
            <div class="rounded-xl border border-stone-800 bg-stone-950 p-4 text-center"><p class="text-2xl font-bold text-white">{stats.total}</p><p class="text-xs text-stone-400">Total</p></div>
            <div class="rounded-xl border border-green-800/50 bg-green-900/20 p-4 text-center"><p class="text-2xl font-bold text-green-400">{stats.hadir}</p><p class="text-xs text-stone-400">Hadir</p></div>
            <div class="rounded-xl border border-yellow-800/50 bg-yellow-900/20 p-4 text-center"><p class="text-2xl font-bold text-yellow-400">{stats.ragu}</p><p class="text-xs text-stone-400">Ragu</p></div>
            <div class="rounded-xl border border-red-800/50 bg-red-900/20 p-4 text-center"><p class="text-2xl font-bold text-red-400">{stats.tidakHadir}</p><p class="text-xs text-stone-400">Tidak Hadir</p></div>
          </div>
        {:else if activeTab === 'keamanan'}
          <h2 class="text-lg font-semibold text-rose-300">Ganti Password Admin</h2>
          <form class="mt-4 max-w-sm space-y-3" onsubmit={(event) => { event.preventDefault(); changePassword() }}>
            <div><label for="current-password" class={labelClass}>Password Saat Ini</label><input id="current-password" bind:value={currentPassword} autocomplete="current-password" type="password" required class={inputClass} /></div>
            <div><label for="new-password" class={labelClass}>Password Baru</label><input id="new-password" bind:value={newPassword} autocomplete="new-password" type="password" minlength="12" required class={inputClass} /></div>
            <button class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60" disabled={changingPassword}>{changingPassword ? 'Mengubah...' : 'Ubah Password'}</button>
            {#if passwordMsg}<p class="text-xs {passwordMsg.includes('berhasil') ? 'text-green-400' : 'text-red-400'}">{passwordMsg}</p>{/if}
          </form>
        {/if}
      </div>

      <!-- Save button -->
      {#if activeTab !== 'verifikasi' && activeTab !== 'ucapan' && activeTab !== 'statistik' && activeTab !== 'keamanan'}
        <div class="mt-4 flex items-center gap-3">
          <button class="rounded-lg bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-500" onclick={save} disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
          {#if savedMsg}<span class="text-sm {savedMsg === 'Tersimpan!' ? 'text-green-400' : 'text-red-400'}">{savedMsg}</span>{/if}
        </div>
      {/if}
    {:else}
      <p class="mt-20 text-center text-stone-500">Memuat...</p>
    {/if}
  </div>
</div>
