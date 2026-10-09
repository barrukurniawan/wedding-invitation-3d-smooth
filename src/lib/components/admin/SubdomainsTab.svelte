<script lang="ts">
  // Semua subdomain terdaftar + email pembuat + trafik, dengan cari/filter/urut,
  // panel detail, dan verifikasi pembayaran (Aktifkan/Tolak lewat dialog).
  import { onMount } from 'svelte'
  import {
    activateInvitation,
    ApiError,
    getAdminSubdomains,
    rejectInvitation,
    type AdminSubdomain,
    type TrafficRange,
  } from '$lib/api-client'
  import { resolveVenue } from '$lib/venues'
  import ConfirmDialog from './ui/ConfirmDialog.svelte'
  import Icon from './ui/Icon.svelte'
  import SubdomainDetail from './SubdomainDetail.svelte'
  import { fmtNumber, fmtRelative, fmtShortDate, statusMeta } from './format'

  type Filter = 'all' | 'pending' | 'active' | 'draft' | 'other'
  type SortKey = 'created' | 'views' | 'last_visit' | 'slug'

  const FILTERS: [Filter, string][] = [
    ['all', 'Semua'],
    ['pending', 'Menunggu verifikasi'],
    ['active', 'Aktif'],
    ['draft', 'Draft / belum bayar'],
    ['other', 'Kedaluwarsa / lainnya'],
  ]

  let items = $state<AdminSubdomain[]>([])
  let range = $state<TrafficRange>(30)
  let loading = $state(true)
  let errorMsg = $state('')
  let query = $state('')
  let filter = $state<Filter>('all')
  let sortKey = $state<SortKey>('created')
  let selectedId = $state<number | null>(null)
  let notice = $state('')

  let dialog = $state<{ kind: 'activate' | 'reject'; item: AdminSubdomain } | null>(null)
  let dialogBusy = $state(false)
  let dialogError = $state('')

  async function load() {
    loading = true
    try {
      items = (await getAdminSubdomains(range)).items
      errorMsg = ''
    } catch {
      errorMsg = 'Gagal memuat daftar subdomain.'
    } finally {
      loading = false
    }
  }

  onMount(load)

  function setRange(next: TrafficRange) {
    range = next
    void load()
  }

  const groupOf = (status: string): Filter =>
    status === 'pending_verification'
      ? 'pending'
      : status === 'active'
        ? 'active'
        : status === 'draft' || status === 'awaiting_payment'
          ? 'draft'
          : 'other'

  const counts = $derived(
    items.reduce(
      (acc, item) => {
        acc[groupOf(item.status)]++
        acc.all++
        return acc
      },
      { all: 0, pending: 0, active: 0, draft: 0, other: 0 } as Record<Filter, number>,
    ),
  )

  const visible = $derived.by(() => {
    const q = query.trim().toLowerCase()
    const filtered = items.filter((item) => {
      if (filter !== 'all' && groupOf(item.status) !== filter) return false
      if (!q) return true
      return [item.slug, item.owner_email, item.owner_name, item.bride_name, item.groom_name].some((v) => v?.toLowerCase().includes(q))
    })
    const pendingFirst = (a: AdminSubdomain, b: AdminSubdomain) =>
      Number(b.status === 'pending_verification') - Number(a.status === 'pending_verification')
    const by: Record<SortKey, (a: AdminSubdomain, b: AdminSubdomain) => number> = {
      created: (a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''),
      views: (a, b) => b.views - a.views || b.total_views - a.total_views,
      last_visit: (a, b) => (b.last_visit ?? '').localeCompare(a.last_visit ?? ''),
      slug: (a, b) => a.slug.localeCompare(b.slug),
    }
    return [...filtered].sort((a, b) => pendingFirst(a, b) || by[sortKey](a, b))
  })

  const selected = $derived(items.find((i) => i.id === selectedId) ?? null)
  const designLabel = (item: AdminSubdomain) => (item.preset === '2d_garden' ? '2D Garden' : `3D · ${resolveVenue(item.venue).label}`)

  function openDialog(kind: 'activate' | 'reject', item: AdminSubdomain) {
    dialogError = ''
    dialog = { kind, item }
  }

  async function confirmDialog(reason: string) {
    if (!dialog) return
    const { kind, item } = dialog
    dialogBusy = true
    dialogError = ''
    try {
      if (kind === 'activate') await activateInvitation(item.id)
      else await rejectInvitation(item.id, reason)
      dialog = null
      notice = kind === 'activate' ? `${item.slug} berhasil diaktifkan.` : `Pembayaran ${item.slug} ditolak.`
      setTimeout(() => (notice = ''), 4000)
      await load()
    } catch (error) {
      dialogError = error instanceof ApiError ? error.message : 'Aksi gagal. Coba lagi.'
    } finally {
      dialogBusy = false
    }
  }
</script>

<div class="adm-card">
  <div class="adm-card-head">
    <div>
      <h2 class="adm-card-title">Semua Subdomain</h2>
      <p class="adm-card-sub">{counts.all} subdomain terdaftar · klik baris untuk detail trafik dan verifikasi</p>
    </div>
    <div class="head-tools">
      <label class="adm-search">
        <Icon name="search" size={16} />
        <input class="adm-input" type="search" placeholder="Cari subdomain, email, nama" bind:value={query} aria-label="Cari subdomain" />
      </label>
      <div class="adm-seg" role="group" aria-label="Rentang kunjungan">
        {#each [7, 30, 90] as const as d (d)}
          <button type="button" class:active={range === d} onclick={() => setRange(d)}>{d}H</button>
        {/each}
      </div>
    </div>
  </div>

  <div class="adm-chips" role="group" aria-label="Filter status">
    {#each FILTERS as [id, label] (id)}
      <button type="button" class="adm-chip" class:active={filter === id} onclick={() => (filter = id)}>
        {#if id === 'pending' && counts.pending > 0}<span class="adm-status" style="--dot: #d97706"></span>{/if}
        {label} <span class="adm-chip-count">{counts[id]}</span>
      </button>
    {/each}
  </div>

  {#if notice}<div class="adm-banner" style="margin-top: 12px"><Icon name="check" size={16} />{notice}</div>{/if}
  {#if errorMsg}<p class="adm-error" style="margin-top: 12px">{errorMsg}</p>{/if}

  {#if loading && items.length === 0}
    <p class="adm-empty">Memuat subdomain...</p>
  {:else}
    <!-- Desktop/tablet: tabel -->
    <div class="adm-table-wrap table-view" style="margin-top: 14px">
      <table class="adm-table">
        <thead>
          <tr>
            <th><button type="button" class="adm-sort" class:active={sortKey === 'slug'} onclick={() => (sortKey = 'slug')}>Subdomain</button></th>
            <th>Pemilik (email pembuat)</th>
            <th>Desain</th>
            <th>Status</th>
            <th class="num"><button type="button" class="adm-sort" class:active={sortKey === 'views'} onclick={() => (sortKey = 'views')}>Kunjungan {range}H</button></th>
            <th class="num">Unik</th>
            <th><button type="button" class="adm-sort" class:active={sortKey === 'last_visit'} onclick={() => (sortKey = 'last_visit')}>Terakhir dikunjungi</button></th>
            <th class="num">RSVP</th>
            <th><button type="button" class="adm-sort" class:active={sortKey === 'created'} onclick={() => (sortKey = 'created')}>Dibuat</button></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each visible as item (item.id)}
            {@const meta = statusMeta(item.status)}
            <tr class="clickable" class:highlight={item.status === 'pending_verification'} onclick={() => (selectedId = item.id)}>
              <td>
                <span class="cell-main strong">{item.slug}</span>
                <span class="cell-sub">{item.bride_name || '—'} &amp; {item.groom_name || '—'}</span>
              </td>
              <td>
                <span class="cell-main">{item.owner_name || '—'}</span>
                <span class="cell-sub">{item.owner_email || 'tanpa email'}</span>
              </td>
              <td><span class="adm-pill">{designLabel(item)}</span></td>
              <td><span class="adm-status" style="--dot: {meta.color}">{meta.label}</span></td>
              <td class="num">
                <span class="cell-main strong">{fmtNumber(item.views)}</span>
                <span class="cell-sub">{fmtNumber(item.total_views)} total</span>
              </td>
              <td class="num">{fmtNumber(item.uniques)}</td>
              <td class="cell-muted">{fmtRelative(item.last_visit)}</td>
              <td class="num">{item.rsvp.total}</td>
              <td class="cell-muted">{fmtShortDate(item.created_at)}</td>
              <td>
                <div class="row-actions">
                  {#if item.status === 'pending_verification'}
                    <button type="button" class="adm-btn success sm" onclick={(e) => { e.stopPropagation(); openDialog('activate', item) }}>Aktifkan</button>
                    <button type="button" class="adm-btn danger sm" onclick={(e) => { e.stopPropagation(); openDialog('reject', item) }}>Tolak</button>
                  {/if}
                  <a class="adm-iconbtn small" href={item.public_url} target="_blank" rel="noreferrer" title="Buka undangan" aria-label="Buka {item.slug}" onclick={(e) => e.stopPropagation()}>
                    <Icon name="external" size={15} />
                  </a>
                </div>
              </td>
            </tr>
          {:else}
            <tr><td colspan="10" class="adm-empty">Tidak ada subdomain yang cocok.</td></tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Mobile: kartu -->
    <ul class="card-view">
      {#each visible as item (item.id)}
        {@const meta = statusMeta(item.status)}
        <li>
          <button type="button" class="m-card" class:highlight={item.status === 'pending_verification'} onclick={() => (selectedId = item.id)}>
            <span class="m-top">
              <strong>{item.slug}</strong>
              <span class="adm-status" style="--dot: {meta.color}">{meta.label}</span>
            </span>
            <span class="m-email">{item.owner_email || 'tanpa email'}</span>
            <span class="m-stats">
              <span><b>{fmtNumber(item.views)}</b> kunjungan {range}H</span>
              <span><b>{item.rsvp.total}</b> RSVP</span>
              <span>{fmtRelative(item.last_visit)}</span>
            </span>
          </button>
        </li>
      {:else}
        <li class="adm-empty">Tidak ada subdomain yang cocok.</li>
      {/each}
    </ul>
  {/if}
</div>

{#if selected}
  <SubdomainDetail
    item={selected}
    {range}
    onClose={() => (selectedId = null)}
    onActivate={(item) => openDialog('activate', item)}
    onReject={(item) => openDialog('reject', item)}
  />
{/if}

{#if dialog}
  {#if dialog.kind === 'activate'}
    <ConfirmDialog
      title="Aktifkan {dialog.item.slug}?"
      message="Undangan akan langsung bisa dibuka tamu dan pemilik menerima email aktivasi."
      confirmLabel="Aktifkan"
      tone="success"
      busy={dialogBusy}
      error={dialogError}
      onConfirm={confirmDialog}
      onCancel={() => (dialog = null)}
    />
  {:else}
    <ConfirmDialog
      title="Tolak pembayaran {dialog.item.slug}?"
      message="Pemilik akan melihat alasan ini dan bisa mengunggah bukti transfer baru."
      confirmLabel="Tolak pembayaran"
      tone="danger"
      inputLabel="Alasan penolakan"
      inputPlaceholder="Mis. nominal transfer tidak sesuai"
      busy={dialogBusy}
      error={dialogError}
      onConfirm={confirmDialog}
      onCancel={() => (dialog = null)}
    />
  {/if}
{/if}

<style>
  .head-tools {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .head-tools .adm-search {
    width: 280px;
  }
  @media (max-width: 760px) {
    .head-tools {
      flex-wrap: wrap;
      width: 100%;
    }
    .head-tools .adm-search {
      width: 100%;
    }
  }
  .cell-main,
  .cell-sub {
    display: block;
    white-space: nowrap;
  }
  .cell-main.strong {
    font-weight: 600;
  }
  .cell-sub,
  .cell-muted {
    font-size: 12px;
    color: var(--adm-muted);
    white-space: nowrap;
  }
  .row-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
  }
  .adm-iconbtn.small {
    width: 32px;
    height: 32px;
  }
  .card-view {
    display: none;
    list-style: none;
    margin: 14px 0 0;
    padding: 0;
    flex-direction: column;
    gap: 10px;
  }
  .m-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
    padding: 14px;
    border-radius: 16px;
    border: 1px solid var(--adm-line);
    background: var(--adm-surface);
    text-align: left;
  }
  .m-card.highlight {
    background: #fffaf0;
    border-color: #f5d9a8;
  }
  .m-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .m-top strong {
    font-size: 15px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .m-email {
    font-size: 12.5px;
    color: var(--adm-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .m-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    font-size: 12px;
    color: var(--adm-ink-2);
  }
  @media (max-width: 640px) {
    .table-view {
      display: none;
    }
    .card-view {
      display: flex;
    }
  }
</style>
