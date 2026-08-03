<script lang="ts">
  import type { GuestbookEntry, GuestbookStats, OwnerInvitation } from '$lib/api-client'

  type Props = {
    invitation: OwnerInvitation
    myGuestbook: { items: GuestbookEntry[]; stats: GuestbookStats } | null
    loadingGuestbook: boolean
    loadGuestbook: () => Promise<void>
    fmtDate: (ts: string) => string
  }
  let { invitation, myGuestbook, loadingGuestbook, loadGuestbook, fmtDate }: Props = $props()

  let guestNameInput = $state('')
  let generatedUrl = $state('')
  let copiedUrl = $state(false)

  function generateGuestLink() {
    if (!guestNameInput.trim()) return
    const base = invitation.public_url
    generatedUrl = `${base}?to=${encodeURIComponent(guestNameInput.trim())}`
  }

  function copyGuestLink() {
    if (!generatedUrl) return
    void navigator.clipboard.writeText(generatedUrl)
    copiedUrl = true
    setTimeout(() => (copiedUrl = false), 2000)
  }
</script>

<div class="workspace-panel">
  <div class="panel-head-row">
    <div>
      <h3>Daftar Ucapan &amp; Konfirmasi Kehadiran Tamu</h3>
      <p class="section-desc">Pesan ucapan serta konfirmasi kehadiran (RSVP) dari para tamu undangan.</p>
    </div>
    <button type="button" class="ghost-btn-sm" onclick={loadGuestbook}>↻ Refresh Data</button>
  </div>

  
  <!-- Generator Link Tamu -->
  <div class="guest-link-generator mt-16 mb-24">
    <h4>Generator Link Undangan Khusus Tamu</h4>
    <p class="section-desc">Ketik nama tamu untuk membuat link undangan khusus yang menyebut nama mereka secara langsung.</p>
    <div class="generate-row" style="display: flex; gap: 8px; margin-bottom: 12px; max-width: 600px;">
      <input bind:value={guestNameInput} placeholder="Contoh: Budi Santoso" style="flex: 1;" />
      <button type="button" class="primary-btn-sm" onclick={generateGuestLink} disabled={!guestNameInput.trim()}>
        Buat Link
      </button>
    </div>
    {#if generatedUrl}
      <div class="generated-url-box" style="padding: 12px; background: rgba(0,0,0,0.02); border: 1px dashed var(--accent-deep); border-radius: 6px; display: flex; align-items: center; justify-content: space-between;">
        <code style="font-size: 0.85rem; color: var(--text-dark); word-break: break-all;">{generatedUrl}</code>
        <button type="button" class="ghost-btn-sm" onclick={copyGuestLink} style="white-space: nowrap; margin-left: 12px;">
          {copiedUrl ? '✓ Tersalin' : '📋 Salin'}
        </button>
      </div>
    {/if}
  </div>

{#if loadingGuestbook}
    <p class="muted-loading">Memuat data ucapan tamu...</p>
  {:else if myGuestbook}
    <!-- RSVP Stat Counters -->
    <div class="rsvp-stats-grid">
      <div class="stat-card">
        <span class="stat-num">{myGuestbook.stats.total}</span>
        <span class="stat-label">Total Ucapan</span>
      </div>
      <div class="stat-card stat-hadir">
        <span class="stat-num">{myGuestbook.stats.hadir}</span>
        <span class="stat-label">Hadir</span>
      </div>
      <div class="stat-card stat-ragu">
        <span class="stat-num">{myGuestbook.stats.ragu}</span>
        <span class="stat-label">Ragu-ragu</span>
      </div>
      <div class="stat-card stat-absent">
        <span class="stat-num">{myGuestbook.stats.tidakHadir}</span>
        <span class="stat-label">Tidak Hadir</span>
      </div>
    </div>

    <!-- Guestbook List -->
    <div class="guestbook-list">
      {#each myGuestbook.items as entry}
        <div class="guestbook-card">
          <div class="guestbook-card-head">
            <div>
              <strong class="guest-name">{entry.name}</strong>
              <span class="attendance-badge" data-attendance={entry.attendance}>{entry.attendance}</span>
            </div>
            <span class="guest-time">{fmtDate(entry.created_at)}</span>
          </div>
          <p class="guest-msg">{entry.message}</p>
        </div>
      {:else}
        <p class="empty-muted-box">Belum ada ucapan dari tamu undangan.</p>
      {/each}
    </div>
  {/if}
</div>
