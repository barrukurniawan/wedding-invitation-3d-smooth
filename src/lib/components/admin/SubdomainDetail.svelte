<script lang="ts">
  // Panel samping detail satu subdomain: trafik harian, sumber, halaman, RSVP, bukti transfer.
  import { fade, fly } from 'svelte/transition'
  import { getAdminSubdomainTraffic, type AdminSubdomain, type SubdomainTraffic, type TrafficRange } from '$lib/api-client'
  import { resolveVenue } from '$lib/venues'
  import BarChart from './ui/BarChart.svelte'
  import Icon from './ui/Icon.svelte'
  import SourceBars from './ui/SourceBars.svelte'
  import { fmtDate, fmtDayLabel, fmtNumber, fmtRelative, fmtShortDate, initials, statusMeta } from './format'

  let {
    item,
    range,
    onClose,
    onActivate,
    onReject,
  }: {
    item: AdminSubdomain
    range: TrafficRange
    onClose: () => void
    onActivate: (item: AdminSubdomain) => void
    onReject: (item: AdminSubdomain) => void
  } = $props()

  let traffic = $state<SubdomainTraffic | null>(null)
  let errorMsg = $state('')
  let proofBroken = $state(false)

  $effect(() => {
    const id = item.id
    const days = range
    traffic = null
    errorMsg = ''
    proofBroken = false
    getAdminSubdomainTraffic(id, days)
      .then((t) => {
        if (item.id === id) traffic = t
      })
      .catch(() => (errorMsg = 'Gagal memuat trafik subdomain.'))
  })

  const meta = $derived(statusMeta(item.status))
  const points = $derived(
    (traffic?.series ?? []).map((p) => ({ label: fmtDayLabel(p.date), title: fmtDayLabel(p.date, true), values: [p.views, p.uniques] })),
  )
  const canVerify = $derived(item.status === 'pending_verification')
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onClose()} />

<div class="adm-drawer-overlay" role="presentation" onclick={onClose} transition:fade={{ duration: 150 }}></div>
<aside class="adm-drawer" aria-label="Detail subdomain {item.slug}" transition:fly={{ x: 40, duration: 200 }}>
  <div class="head">
    <div class="min-w-0">
      <span class="adm-status" style="--dot: {meta.color}">{meta.label}</span>
      <h2>{item.slug}<span>.marryme.web.id</span></h2>
      {#if item.bride_name || item.groom_name}
        <p class="couple">{item.bride_name || '—'} &amp; {item.groom_name || '—'}</p>
      {/if}
    </div>
    <button type="button" class="adm-iconbtn" aria-label="Tutup" onclick={onClose}><Icon name="x" /></button>
  </div>

  <div class="actions">
    <a class="adm-btn ghost sm" href={item.public_url} target="_blank" rel="noreferrer"><Icon name="external" size={14} /> Buka undangan</a>
    {#if canVerify}
      <button type="button" class="adm-btn success sm" onclick={() => onActivate(item)}><Icon name="check" size={14} /> Aktifkan</button>
      <button type="button" class="adm-btn danger sm" onclick={() => onReject(item)}><Icon name="x" size={14} /> Tolak</button>
    {/if}
  </div>

  <div class="adm-card owner">
    <span class="adm-avatar">{initials(item.owner_name || item.owner_email)}</span>
    <div class="owner-text">
      <strong>{item.owner_name || 'Tanpa akun'}</strong>
      <span>{item.owner_email || 'Tidak ada email pembuat (data awal)'}</span>
    </div>
  </div>

  <div class="tiles">
    <div class="tile"><span>Kunjungan {range}H</span><strong>{fmtNumber(item.views)}</strong></div>
    <div class="tile"><span>Visitor unik</span><strong>{fmtNumber(item.uniques)}</strong></div>
    <div class="tile"><span>Total sepanjang waktu</span><strong>{fmtNumber(item.total_views)}</strong></div>
    <div class="tile"><span>Ucapan / RSVP</span><strong>{fmtNumber(item.rsvp.total)}</strong></div>
  </div>

  <div class="adm-card block">
    <div class="adm-card-head">
      <div>
        <h3 class="adm-card-title">Kunjungan harian</h3>
        <p class="adm-card-sub">Terakhir dikunjungi: {fmtRelative(item.last_visit)}</p>
      </div>
    </div>
    {#if errorMsg}
      <p class="adm-error">{errorMsg}</p>
    {:else if !traffic}
      <p class="adm-empty">Memuat trafik...</p>
    {:else if item.views === 0}
      <p class="adm-empty">Belum ada kunjungan dalam {range} hari terakhir.</p>
    {:else}
      <BarChart
        {points}
        series={[
          { name: 'Pageviews', color: 'var(--adm-accent)', striped: true },
          { name: 'Visitor unik', color: 'var(--adm-ink)' },
        ]}
        height={150}
      />
    {/if}
  </div>

  {#if traffic && traffic.sources.length > 0}
    <div class="adm-card block">
      <h3 class="adm-card-title" style="margin-bottom: 12px">Sumber trafik</h3>
      <SourceBars sources={traffic.sources} />
    </div>
  {/if}

  <div class="adm-card block">
    <h3 class="adm-card-title" style="margin-bottom: 12px">RSVP tamu</h3>
    <div class="rsvp">
      <div><span class="adm-status" style="--dot: var(--adm-accent)">Hadir</span><strong>{item.rsvp.hadir}</strong></div>
      <div><span class="adm-status" style="--dot: var(--adm-rose)">Ragu-ragu</span><strong>{item.rsvp.ragu}</strong></div>
      <div><span class="adm-status" style="--dot: var(--adm-ink)">Tidak hadir</span><strong>{item.rsvp.tidakHadir}</strong></div>
    </div>
  </div>

  <div class="adm-card block">
    <h3 class="adm-card-title" style="margin-bottom: 8px">Info undangan</h3>
    <dl class="info">
      <dt>Desain</dt>
      <dd>{item.preset === '2d_garden' ? '2D Pixel Garden' : `3D · ${resolveVenue(item.venue).label}`}</dd>
      <dt>Dibuat</dt>
      <dd>{fmtShortDate(item.created_at)}</dd>
      <dt>Diaktifkan</dt>
      <dd>{item.activated_at ? fmtShortDate(item.activated_at) : '—'}</dd>
      <dt>Berlaku sampai</dt>
      <dd>{fmtShortDate(item.expires_at)}</dd>
      {#if item.rejection_reason}
        <dt>Alasan ditolak</dt>
        <dd>{item.rejection_reason}</dd>
      {/if}
    </dl>
  </div>

  <div class="adm-card block">
    <h3 class="adm-card-title" style="margin-bottom: 8px">Bukti transfer</h3>
    {#if item.payment_proof_url}
      <p class="adm-card-sub" style="margin: 0 0 10px">Dikirim {fmtDate(item.payment_submitted_at || '')}</p>
      {#if proofBroken}
        <div class="proof-broken">
          <Icon name="image" />
          <span>Bukti tidak bisa dimuat.</span>
          <a href={item.payment_proof_url} target="_blank" rel="noreferrer">Buka file ↗</a>
        </div>
      {:else}
        <a href={item.payment_proof_url} target="_blank" rel="noreferrer">
          <img src={item.payment_proof_url} alt="Bukti transfer {item.slug}" class="proof" onerror={() => (proofBroken = true)} />
        </a>
      {/if}
    {:else}
      <p class="adm-hint">Belum ada bukti transfer diunggah.</p>
    {/if}
  </div>
</aside>

<style>
  .head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }
  .head h2 {
    margin: 8px 0 0;
    font-size: 24px;
    font-weight: 600;
    letter-spacing: -0.02em;
    word-break: break-all;
  }
  .head h2 span {
    color: var(--adm-muted);
    font-weight: 400;
    font-size: 16px;
  }
  .couple {
    margin: 4px 0 0;
    color: var(--adm-accent);
    font-weight: 500;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 14px;
  }
  .owner {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 16px;
    padding: 14px 16px;
  }
  .owner-text {
    min-width: 0;
  }
  .owner-text strong,
  .owner-text span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .owner-text span {
    font-size: 12.5px;
    color: var(--adm-muted);
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 12px;
  }
  .tile {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 14px;
    border-radius: 16px;
    background: var(--adm-surface);
    border: 1px solid var(--adm-line);
  }
  .tile span {
    font-size: 12px;
    color: var(--adm-muted);
  }
  .tile strong {
    font-size: 22px;
    font-weight: 600;
  }
  .block {
    margin-top: 12px;
  }
  .rsvp {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }
  .rsvp div {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px;
    border-radius: 12px;
    background: var(--adm-soft);
  }
  .rsvp strong {
    font-size: 20px;
    font-weight: 600;
  }
  .rsvp .adm-status {
    font-size: 12px;
  }
  .info {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 8px 16px;
    margin: 0;
    font-size: 13px;
  }
  .info dt {
    color: var(--adm-muted);
  }
  .info dd {
    margin: 0;
    font-weight: 500;
  }
  .proof {
    max-height: 320px;
    max-width: 100%;
    border-radius: 12px;
    border: 1px solid var(--adm-line);
    object-fit: contain;
  }
  .proof-broken {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px;
    border-radius: 12px;
    background: var(--adm-soft);
    color: var(--adm-muted);
    font-size: 13px;
  }
  .proof-broken a {
    margin-left: auto;
    color: var(--adm-accent);
    font-weight: 600;
  }
</style>
