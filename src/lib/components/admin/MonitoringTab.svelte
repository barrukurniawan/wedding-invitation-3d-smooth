<script lang="ts">
  // Ringkasan platform: KPI, grafik kunjungan, RSVP, registrasi, dan subdomain terbaru.
  import { onMount } from 'svelte'
  import {
    getAdminSubdomains,
    getAnalyticsSummary,
    getAnalyticsVisitors,
    getPlatformTraffic,
    type AdminSubdomain,
    type AnalyticsSummary,
    type AnalyticsVisitors,
    type PlatformTraffic,
  } from '$lib/api-client'
  import BarChart from './ui/BarChart.svelte'
  import Icon from './ui/Icon.svelte'
  import KpiCard from './ui/KpiCard.svelte'
  import { fmtDayLabel, fmtIdr, fmtNumber, fmtRelative, fmtShortDate, initials, statusMeta } from './format'

  let { onNavigate }: { onNavigate: (menu: 'subdomain' | 'trafik') => void } = $props()

  const POLL_MS = 30000

  let summary = $state<AnalyticsSummary | null>(null)
  let visitors = $state<AnalyticsVisitors | null>(null)
  let traffic = $state<PlatformTraffic | null>(null)
  let subdomains = $state<AdminSubdomain[]>([])
  let range = $state<7 | 30>(7)
  let loading = $state(true)
  let errorMsg = $state('')
  let updatedAt = $state('')

  async function load() {
    if (typeof document !== 'undefined' && document.hidden) return
    try {
      const [s, v, t, d] = await Promise.all([getAnalyticsSummary(), getAnalyticsVisitors(7), getPlatformTraffic(range), getAdminSubdomains(30)])
      summary = s
      visitors = v
      traffic = t
      subdomains = d.items
      errorMsg = ''
      updatedAt = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    } catch {
      errorMsg = 'Gagal memuat data ringkasan.'
    } finally {
      loading = false
    }
  }

  function switchRange(next: 7 | 30) {
    range = next
    void load()
  }

  onMount(() => {
    void load()
    const interval = setInterval(load, POLL_MS)
    return () => clearInterval(interval)
  })

  const totalViews = $derived(traffic?.totals.views ?? 0)
  const totalUniques = $derived(traffic?.totals.uniques ?? 0)
  const chartPoints = $derived(
    (traffic?.series ?? []).map((p) => ({
      label: fmtDayLabel(p.date),
      title: fmtDayLabel(p.date, true),
      values: [p.invitationViews, p.platformViews],
    })),
  )
  const latest = $derived([...subdomains].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')).slice(0, 6))
  const rsvpPct = (n: number) => (summary && summary.rsvps.total > 0 ? (n / summary.rsvps.total) * 100 : 0)
</script>

{#if errorMsg}<p class="adm-error" style="margin-bottom: 12px">{errorMsg}</p>{/if}

{#if loading && !summary}
  <div class="adm-card"><p class="adm-empty">Memuat ringkasan...</p></div>
{:else if summary}
  <div class="adm-grid adm-grid-hero">
    <!-- Total subdomain -->
    <div class="adm-card">
      <div class="adm-card-head" style="margin-bottom: 6px">
        <span class="adm-card-sub" style="margin: 0">Total Subdomain</span>
        <span class="adm-pill">Diperbarui {updatedAt || '-'}</span>
      </div>
      <p class="big-number">{fmtNumber(summary.tenants.total)}</p>
      <div class="adm-kpi-foot" style="margin-top: 6px">
        <span class="adm-pill green">+{summary.users.new30d} user</span>
        <span>dalam 30 hari terakhir</span>
      </div>
      <div class="quick-actions">
        <button type="button" class="adm-btn" onclick={() => onNavigate('subdomain')}><Icon name="globe" size={16} /> Lihat Subdomain</button>
        <button type="button" class="adm-btn ghost" onclick={() => onNavigate('trafik')}><Icon name="chart" size={16} /> Trafik</button>
      </div>
      <div class="adm-card-soft" style="margin-top: 14px">
        <p class="mini-title">Status undangan</p>
        <div class="status-tiles">
          <div class="status-tile">
            <span class="adm-status" style="--dot: #16a34a">Aktif</span>
            <strong>{summary.tenants.active}</strong>
          </div>
          <div class="status-tile">
            <span class="adm-status" style="--dot: #d97706">Menunggu</span>
            <strong>{summary.tenants.pending}</strong>
          </div>
          <div class="status-tile">
            <span class="adm-status" style="--dot: #a8a29e">Draft</span>
            <strong>{summary.tenants.draft}</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- KPI 2x2 -->
    <div class="adm-card kpi-card">
      <div class="kpi-grid">
        <KpiCard hero label="Undangan Aktif" value={fmtNumber(summary.tenants.active)} icon="globe" badge="{summary.tenants.total} subdomain" note="terdaftar" />
        <KpiCard label="Total User" value={fmtNumber(summary.users.total)} icon="users" badge="+{summary.users.new30d}" badgeTone="green" note="30 hari" />
        <KpiCard label="Kunjungan" value={fmtNumber(totalViews)} icon="eye" badge="{fmtNumber(totalUniques)} unik" badgeTone="rose" note="{range} hari" />
        <KpiCard
          label="Pembayaran"
          value={fmtNumber(summary.payments.receivedCount)}
          icon="wallet"
          badge={summary.payments.pendingCount > 0 ? `${summary.payments.pendingCount} pending` : fmtIdr(summary.payments.amountReceived)}
          badgeTone={summary.payments.pendingCount > 0 ? 'amber' : ''}
          note="diterima"
        />
      </div>
    </div>

    <!-- Grafik kunjungan -->
    <div class="adm-card chart-card">
      <div class="adm-card-head">
        <div>
          <h2 class="adm-card-title">Kunjungan</h2>
          <p class="adm-card-sub">Pageviews semua web per hari, undangan vs platform</p>
        </div>
        <div class="adm-seg" role="group" aria-label="Rentang waktu">
          <button type="button" class:active={range === 7} onclick={() => switchRange(7)}>7H</button>
          <button type="button" class:active={range === 30} onclick={() => switchRange(30)}>30H</button>
        </div>
      </div>
      <div class="adm-card-soft">
        <div class="legend">
          <span><i style="background: var(--adm-accent)"></i>Undangan</span>
          <span><i style="background: var(--adm-ink)"></i>marryme.web.id</span>
        </div>
        {#if totalViews === 0}
          <p class="adm-empty">Belum ada kunjungan dalam {range} hari terakhir.</p>
        {:else}
          <BarChart
            points={chartPoints}
            series={[
              { name: 'Undangan', color: 'var(--adm-accent)', striped: true },
              { name: 'marryme.web.id', color: 'var(--adm-ink)' },
            ]}
            stacked
            height={190}
          />
        {/if}
      </div>
    </div>
  </div>

  <div class="adm-grid adm-grid-split adm-section">
    <div class="adm-grid" style="align-content: start">
      <!-- RSVP -->
      <div class="adm-card">
        <div class="adm-card-head">
          <div>
            <h2 class="adm-card-title">RSVP Semua Undangan</h2>
            <p class="adm-card-sub">{fmtNumber(summary.rsvps.total)} ucapan dari tamu</p>
          </div>
          <span class="adm-kpi-icon static"><Icon name="heart" size={16} /></span>
        </div>
        <div class="rsvp-bar" aria-hidden="true">
          <span style="width: {rsvpPct(summary.rsvps.hadir)}%; background: var(--adm-accent)"></span>
          <span style="width: {rsvpPct(summary.rsvps.ragu)}%; background: var(--adm-rose)"></span>
          <span style="width: {rsvpPct(summary.rsvps.tidakHadir)}%; background: var(--adm-ink)"></span>
        </div>
        <div class="rsvp-legend">
          <span><i style="background: var(--adm-accent)"></i>Hadir <b>{summary.rsvps.hadir}</b></span>
          <span><i style="background: var(--adm-rose)"></i>Ragu <b>{summary.rsvps.ragu}</b></span>
          <span><i style="background: var(--adm-ink)"></i>Tidak <b>{summary.rsvps.tidakHadir}</b></span>
        </div>
      </div>

      <!-- Registrasi terbaru -->
      <div class="adm-card">
        <div class="adm-card-head">
          <h2 class="adm-card-title">Registrasi Terbaru</h2>
        </div>
        {#if !visitors || visitors.recentUsers.length === 0}
          <p class="adm-empty">Belum ada registrasi.</p>
        {:else}
          <ul class="people">
            {#each visitors.recentUsers as user, i (user.email ?? i)}
              <li>
                <span class="adm-avatar">{initials(user.displayName)}</span>
                <span class="people-text">
                  <strong>{user.displayName}</strong>
                  <span>{user.email || '—'}</span>
                </span>
                <span class="people-date">{fmtShortDate(user.createdAt)}</span>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </div>

    <!-- Subdomain terbaru -->
    <div class="adm-card" style="align-self: start">
      <div class="adm-card-head">
        <div>
          <h2 class="adm-card-title">Subdomain Terbaru</h2>
          <p class="adm-card-sub">Pendaftaran terakhir beserta email pembuatnya</p>
        </div>
        <button type="button" class="adm-btn ghost sm" onclick={() => onNavigate('subdomain')}>Lihat semua ({subdomains.length})</button>
      </div>
      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead>
            <tr>
              <th>Subdomain</th>
              <th>Pemilik</th>
              <th>Status</th>
              <th class="num">Kunjungan 30H</th>
              <th>Terakhir dikunjungi</th>
            </tr>
          </thead>
          <tbody>
            {#each latest as item (item.id)}
              {@const meta = statusMeta(item.status)}
              <tr>
                <td>
                  <a class="slug-link" href={item.public_url} target="_blank" rel="noreferrer">{item.slug}</a>
                  <span class="cell-sub">Dibuat {fmtShortDate(item.created_at)}</span>
                </td>
                <td>
                  <span class="cell-main">{item.owner_name || '—'}</span>
                  <span class="cell-sub">{item.owner_email || 'tanpa email'}</span>
                </td>
                <td><span class="adm-status" style="--dot: {meta.color}">{meta.label}</span></td>
                <td class="num">{fmtNumber(item.views)}</td>
                <td class="cell-muted">{fmtRelative(item.last_visit)}</td>
              </tr>
            {:else}
              <tr><td colspan="5" class="adm-empty">Belum ada subdomain.</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>
{/if}

<style>
  .big-number {
    margin: 0;
    font-size: 40px;
    font-weight: 600;
    letter-spacing: -0.03em;
    line-height: 1.1;
  }
  .quick-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 16px;
  }
  .mini-title {
    margin: 0 0 10px;
    font-size: 12.5px;
    color: var(--adm-muted);
  }
  .status-tiles {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }
  .status-tile {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px;
    border-radius: 12px;
    background: var(--adm-surface);
  }
  .status-tile strong {
    font-size: 20px;
    font-weight: 600;
  }
  .status-tile .adm-status {
    font-size: 12px;
  }
  .kpi-card {
    padding: 10px;
  }
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    height: 100%;
  }
  .legend,
  .rsvp-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    font-size: 12px;
    color: var(--adm-ink-2);
  }
  .legend {
    justify-content: flex-end;
    margin-bottom: 8px;
  }
  .legend span,
  .rsvp-legend span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .legend i,
  .rsvp-legend i {
    width: 9px;
    height: 9px;
    border-radius: 3px;
  }
  .rsvp-bar {
    display: flex;
    gap: 3px;
    height: 12px;
    border-radius: 999px;
    overflow: hidden;
    background: repeating-linear-gradient(135deg, var(--adm-soft) 0 6px, var(--adm-line) 6px 8px);
  }
  .rsvp-bar span {
    height: 100%;
    border-radius: 999px;
  }
  .rsvp-legend {
    margin-top: 12px;
  }
  .adm-kpi-icon.static {
    position: static;
  }
  .people {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .people li {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .people-text {
    flex: 1;
    min-width: 0;
  }
  .people-text strong,
  .people-text span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .people-text strong {
    font-size: 13.5px;
    font-weight: 600;
  }
  .people-text span,
  .people-date {
    font-size: 12px;
    color: var(--adm-muted);
  }
  .people-date {
    white-space: nowrap;
  }
  .slug-link {
    font-weight: 600;
    color: var(--adm-ink);
  }
  .slug-link:hover {
    color: var(--adm-accent);
    text-decoration: underline;
  }
  .cell-main,
  .cell-sub {
    display: block;
    white-space: nowrap;
  }
  .cell-sub,
  .cell-muted {
    font-size: 12px;
    color: var(--adm-muted);
    white-space: nowrap;
  }
</style>
